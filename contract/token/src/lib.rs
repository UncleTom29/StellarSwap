#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String,
};

#[contracttype]
#[derive(Clone)]
pub struct State {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
    pub balances: Map<Address, i128>,
    pub admin: Address,
}

#[contracttype]
pub enum Key {
    State,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn init(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        supply: i128,
    ) {
        if env.storage().instance().has(&Key::State) {
            panic!("exists");
        }
        if supply <= 0 {
            panic!("invalid");
        }
        let mut balances: Map<Address, i128> = Map::new(&env);
        balances.set(admin.clone(), supply);

        let state = State {
            name: name.clone(),
            symbol: symbol.clone(),
            decimals: 7,
            total_supply: supply,
            balances,
            admin: admin.clone(),
        };
        env.storage().instance().set(&Key::State, &state);
        env.storage().instance().extend_ttl(200_000, 200_000);

        env.events().publish(
            (symbol_short!("INIT"), admin.clone()),
            (name, symbol, supply),
        );
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("invalid");
        }
        let mut state: State = env.storage().instance().get(&Key::State).unwrap();
        let from_bal = state.balances.get(from.clone()).unwrap_or(0);
        if from_bal < amount {
            panic!("insufficient");
        }
        state.balances.set(from.clone(), from_bal - amount);
        let to_bal = state.balances.get(to.clone()).unwrap_or(0);
        state.balances.set(to.clone(), to_bal + amount);
        env.storage().instance().set(&Key::State, &state);
        env.storage().instance().extend_ttl(200_000, 200_000);

        env.events()
            .publish((symbol_short!("XFER"), from, to), amount);
    }

    pub fn balance(env: Env, addr: Address) -> i128 {
        let state: State = env.storage().instance().get(&Key::State).unwrap();
        state.balances.get(addr).unwrap_or(0)
    }

    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) {
        admin.require_auth();
        if amount <= 0 {
            panic!("invalid");
        }
        let mut state: State = env.storage().instance().get(&Key::State).unwrap();
        if state.admin != admin {
            panic!("not admin");
        }
        let bal = state.balances.get(to.clone()).unwrap_or(0);
        state.balances.set(to.clone(), bal + amount);
        state.total_supply += amount;
        env.storage().instance().set(&Key::State, &state);
        env.storage().instance().extend_ttl(200_000, 200_000);

        env.events()
            .publish((symbol_short!("MINT"), admin, to), amount);
    }

    pub fn name(env: Env) -> String {
        let state: State = env.storage().instance().get(&Key::State).unwrap();
        state.name
    }

    pub fn symbol(env: Env) -> String {
        let state: State = env.storage().instance().get(&Key::State).unwrap();
        state.symbol
    }
}
