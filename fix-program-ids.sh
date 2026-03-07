#!/bin/bash
# Update declare_id! in source to match testnet deployment addresses

# aegis
sed -i 's/declare_id!("E9eCCUEZ5g41ddKGN9Coju43QzKJuEG4FEm32j1sTwNG")/declare_id!("F2dTW59to7C3zqFuTVa2LZWSnhJfixBse2ytimQeU4Kd")/g' programs/aegis/src/lib.rs

# fee-distributor  
sed -i 's/declare_id!("7mLJQemwoCQztdtRXshEY7poKNKJN98m39foqvK3DnCg")/declare_id!("BrjsCzt26mJEmSXaQmQxud3r1EfRcs5neJ3JH75U2Tzx")/g' programs/fee-distributor/src/lib.rs

# staking is already correct: AgAQSxNVkSCFzmtkk5iZ5Wn16Sfj1sY4XqX5nnRxZqad
echo "Updated declare_id values for testnet"
