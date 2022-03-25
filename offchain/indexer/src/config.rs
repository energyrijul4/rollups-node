/* Copyright 2021 Cartesi Pte. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

use configuration::config::Config;
use configuration::config::EnvCLIConfig;
use configuration::error as config_error;

use serde::Deserialize;
use snafu::ResultExt;

use ethers::core::types::{Address, U256};

use structopt::StructOpt;

#[derive(StructOpt, Clone)]
pub struct ApplicationCLIConfig {
    #[structopt(flatten)]
    pub basic_config: EnvCLIConfig,
    #[structopt(flatten)]
    pub indexer_config: IndexerEnvCLIConfig,
}

#[derive(StructOpt, Clone)]
#[structopt(name = "indexer_config", about = "Configuration for indexer")]
pub struct IndexerEnvCLIConfig {
    #[structopt(long, env)]
    pub dapp_contract_address: Option<String>,
    #[structopt(long, env)]
    pub contract_name: Option<String>,
    #[structopt(long, env)]
    pub indexer_config_path: Option<String>,
    #[structopt(long)]
    pub state_server_endpoint: Option<String>,
    #[structopt(long)]
    pub interval: Option<u64>,
    #[structopt(long)]
    pub initial_epoch: Option<u64>,
    #[structopt(long)]
    pub postgres_endpoint: Option<String>,
    #[structopt(long)]
    pub mm_endpoint: Option<String>,
    #[structopt(long)]
    pub session_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct IndexerFileConfig {
    pub dapp_contract_address: Option<String>,
    pub state_server_endpoint: Option<String>,
    pub interval: Option<u64>,
    pub initial_epoch: Option<u64>,
    pub postgres_endpoint: Option<String>,
    pub mm_endpoint: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct FileConfig {
    pub indexer_config: IndexerFileConfig,
}

#[derive(Clone, Debug)]
pub struct IndexerConfig {
    pub dapp_contract_address: Address,
    pub state_server_endpoint: String,
    pub initial_epoch: U256,

    pub interval: u64,

    pub mm_endpoint: String,
    pub postgres_endpoint: String,
    pub session_id: String,
}

impl IndexerConfig {
    pub fn initialize() -> config_error::Result<Self> {
        let app_config = ApplicationCLIConfig::from_args();
        let env_cli_config = app_config.indexer_config;
        let base_cli_config = app_config.basic_config;

        let file_config: IndexerFileConfig = {
            let c: FileConfig = configuration::config::load_config_file(
                env_cli_config.indexer_config_path,
            )?;
            c.indexer_config
        };
        let basic_config = Config::initialize(base_cli_config)?;

        let contract_name = env_cli_config
            .contract_name
            .unwrap_or("CartesiDApp".to_string());
        let dapp_contract_address = basic_config.contracts[&contract_name];

        let state_server_endpoint: String = env_cli_config
            .state_server_endpoint
            .or(file_config.state_server_endpoint)
            .ok_or(snafu::NoneError)
            .context(config_error::FileError {
                err: "Must specify state server endpoint",
            })?;

        let initial_epoch: U256 = U256::from(
            env_cli_config
                .initial_epoch
                .or(file_config.initial_epoch)
                .ok_or(snafu::NoneError)
                .context(config_error::FileError {
                    err: "Must specify initial epoch",
                })?,
        );

        let interval: u64 = env_cli_config
            .interval
            .or(file_config.interval)
            .ok_or(snafu::NoneError)
            .context(config_error::FileError {
                err: "Must specify interval",
            })?;

        let mm_endpoint: String = env_cli_config
            .mm_endpoint
            .or(file_config.mm_endpoint)
            .ok_or(snafu::NoneError)
            .context(config_error::FileError {
                err: "Must specify machine manager endpoint",
            })?;

        let postgres_endpoint: String = env_cli_config
            .postgres_endpoint
            .or(file_config.postgres_endpoint)
            .ok_or(snafu::NoneError)
            .context(config_error::FileError {
                err: "Must specify postgres endpoint",
            })?;

        let session_id: String = env_cli_config
            .session_id
            .or(file_config.session_id)
            .ok_or(snafu::NoneError)
            .context(config_error::FileError {
                err: "Must specify session id endpoint",
            })?;

        Ok(IndexerConfig {
            dapp_contract_address,
            state_server_endpoint,
            initial_epoch,
            interval,
            mm_endpoint,
            postgres_endpoint,
            session_id,
        })
    }
}
