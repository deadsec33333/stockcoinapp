-- xStocks on Solana. Double check every mint on solscan.io before going live.
insert into stocks (symbol, xstock_symbol, name, mint) values
 ('AAPL','AAPLx','Apple','XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'),
 ('TSLA','TSLAx','Tesla','XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB'),
 ('NVDA','NVDAx','Nvidia','Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'),
 ('MSFT','MSFTx','Microsoft','XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX'),
 ('AMZN','AMZNx','Amazon','Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg'),
 ('GOOGL','GOOGLx','Alphabet','XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'),
 ('META','METAx','Meta','Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu'),
 ('COIN','COINx','Coinbase','Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu'),
 ('MSTR','MSTRx','MicroStrategy','XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ'),
 ('PLTR','PLTRx','Palantir','XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4'),
 ('HOOD','HOODx','Robinhood','XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg'),
 ('GME','GMEx','GameStop','Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc'),
 ('CRCL','CRCLx','Circle','XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1'),
 ('SPY','SPYx','S&P 500 ETF','XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W'),
 ('QQQ','QQQx','Nasdaq 100 ETF','Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ')
on conflict (symbol) do nothing;
