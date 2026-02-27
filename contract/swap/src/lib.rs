#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env,
};

#[contracttype]
#[derive(Clone)]
pub struct Pool {
    pub xlm_reserve: i128,
    pub token_reserve: i128,
    pub token_contract: Address,
}

#[contracttype]
pub enum Keys {
    Pool,
    Admin,
    TotalSwaps,
}

#[contract]
pub struct SwapContract;

#[contractimpl]
impl SwapContract {
    pub fn init(
        env: Env,
        admin: Address,
        token_contract: Address,
        xlm_seed: i128,
        token_seed: i128,
    ) {
        if env.storage().instance().has(&Keys::Pool) {
            panic!("exists");
        }
        if xlm_seed <= 0 || token_seed <= 0 {
            panic!("invalid");
        }
        let pool = Pool {
            xlm_reserve: xlm_seed,
            token_reserve: token_seed,
            token_contract,
        };
        env.storage().instance().set(&Keys::Pool, &pool);
        env.storage().instance().set(&Keys::Admin, &admin);
        env.storage().instance().set(&Keys::TotalSwaps, &0i64);
        env.storage().instance().extend_ttl(200_000, 200_000);
    }

    pub fn swap_xlm_to_token(env: Env, user: Address, xlm_in: i128) -> i128 {
        user.require_auth();
        if xlm_in <= 0 {
            panic!("invalid");
        }
        let mut pool: Pool = env.storage().instance().get(&Keys::Pool).unwrap();

        let xlm_in_fee = xlm_in * 997;
        let numerator = xlm_in_fee * pool.token_reserve;
        let denominator = pool.xlm_reserve * 1000 + xlm_in_fee;
        let token_out = numerator / denominator;

        if token_out <= 0 || token_out >= pool.token_reserve {
            panic!("insufficient liquidity");
        }

        pool.xlm_reserve += xlm_in;
        pool.token_reserve -= token_out;
        env.storage().instance().set(&Keys::Pool, &pool);

        let swaps: i64 = env
            .storage()
            .instance()
            .get(&Keys::TotalSwaps)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&Keys::TotalSwaps, &(swaps + 1));
        env.storage().instance().extend_ttl(200_000, 200_000);

        env.events()
            .publish((symbol_short!("SWAP"), user), (xlm_in, token_out));

        token_out
    }

    pub fn swap_token_to_xlm(env: Env, user: Address, token_in: i128) -> i128 {
        user.require_auth();
        if token_in <= 0 {
            panic!("invalid");
        }
        let mut pool: Pool = env.storage().instance().get(&Keys::Pool).unwrap();

        let token_in_fee = token_in * 997;
        let numerator = token_in_fee * pool.xlm_reserve;
        let denominator = pool.token_reserve * 1000 + token_in_fee;
        let xlm_out = numerator / denominator;

        if xlm_out <= 0 || xlm_out >= pool.xlm_reserve {
            panic!("insufficient liquidity");
        }

        pool.token_reserve += token_in;
        pool.xlm_reserve -= xlm_out;
        env.storage().instance().set(&Keys::Pool, &pool);

        let swaps: i64 = env
            .storage()
            .instance()
            .get(&Keys::TotalSwaps)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&Keys::TotalSwaps, &(swaps + 1));
        env.storage().instance().extend_ttl(200_000, 200_000);

        env.events()
            .publish((symbol_short!("SWAP"), user), (token_in, xlm_out));

        xlm_out
    }

    pub fn get_pool(env: Env) -> Pool {
        env.storage().instance().get(&Keys::Pool).unwrap()
    }

    pub fn get_price(env: Env, xlm_in: i128) -> i128 {
        let pool: Pool = env.storage().instance().get(&Keys::Pool).unwrap();
        let xlm_in_fee = xlm_in * 997;
        let numerator = xlm_in_fee * pool.token_reserve;
        let denominator = pool.xlm_reserve * 1000 + xlm_in_fee;
        numerator / denominator
    }

    pub fn total_swaps(env: Env) -> i64 {
        env.storage()
            .instance()
            .get(&Keys::TotalSwaps)
            .unwrap_or(0)
    }
}
