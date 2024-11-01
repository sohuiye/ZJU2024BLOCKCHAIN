import { Button, Image, Input, Modal } from 'antd'; 
import { Header } from "../../asset";
import { UserOutlined } from "@ant-design/icons";
import { useEffect, useState } from 'react';
import { BuyMyRoomContract, myERC20Contract, web3 } from "../../utils/contracts";
import './index.css';

interface House {
    tokenId: number;
    owner: string;
    price: number;      // ETH 价格
    erc20Price: number; // 新增 ERC20 价格
}

const RealEstatePage = () => {
    const [account, setAccount] = useState<string>('');
    const [houses, setHouses] = useState<House[]>([]);
    const [accountHouses, setAccountHouses] = useState<House[]>([]);
    const [managerAccount, setManagerAccount] = useState<string>('');
    const [price, setPrice] = useState<number>(0);
    const [erc20Price, seterc20Price] = useState<number>(0);
    const [ethBalance, setEthBalance] = useState<number>(0);
    const [erc20Balance, setErc20Balance] = useState<number>(0);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentTokenId, setCurrentTokenId] = useState<number | null>(null);
    const [ethToErc20Amount, setEthToErc20Amount] = useState<number>(0);
    const [erc20ToEthAmount, setErc20ToEthAmount] = useState<number>(0);


    useEffect(() => {
        const initCheckAccounts = async () => {
            const { ethereum } = window as any;
            if (ethereum && ethereum.isMetaMask) {
                const accounts = await web3.eth.getAccounts();
                if (accounts && accounts.length) {
                    setAccount(accounts[0]);
                }
            }
        };
        initCheckAccounts();
    }, []);

    useEffect(() => {
        const getContractInfo = async () => {
            if (BuyMyRoomContract && account) {
                try {
                    const ma = await BuyMyRoomContract.methods.manager().call();
                    setManagerAccount(ma);
                } catch (error) {
                    console.error('Error fetching manager:', error);
                }

                const allHouses = await BuyMyRoomContract.methods.getHousesForSale().call();
                const formattedHouses = allHouses.map((house: any) => ({
                    tokenId: Number(house.tokenId),
                    owner: house.owner,
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                }));
                setHouses(formattedHouses);
                
                const balance = await web3.eth.getBalance(account);
                setEthBalance(Number(web3.utils.fromWei(balance, 'ether')));

                const erc20Balance = await myERC20Contract.methods.balanceOf(account).call();
                setErc20Balance(Number(web3.utils.fromWei(erc20Balance, 'ether')));

                const myHouses = await BuyMyRoomContract.methods.getMyHouses().call({ from: account });
                const formattedMyHouses = myHouses.map((house: any) => ({
                    tokenId: Number(house.tokenId),
                    owner: house.owner,
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                }));
                setAccountHouses(formattedMyHouses);
            }
        };
        getContractInfo();
    }, [account]);

    const onMintHouse = async () => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }

        if (BuyMyRoomContract) {
            try {
                await BuyMyRoomContract.methods.mintHouse().send({ from: account });
                alert('You have minted a new house!');
                const updatedHouses = await BuyMyRoomContract.methods.getHousesForSale().call();
                const formattedHouses = updatedHouses.map((house: any) => ({
                    tokenId: Number(house.tokenId),
                    owner: house.owner,
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                }));
                setHouses(formattedHouses);
            } catch (error) {
                alert(error);
            }
        }
    };

    const showModal = (tokenId: number) => {
        
        setCurrentTokenId(tokenId);
        setIsModalVisible(true);
    };

    const handleOk = async () => {
        console.log("ETH 价格:", price);
        console.log("ERC20 价格:", erc20Price);
        if (currentTokenId !== null) {
            await onPutHouseForSale(currentTokenId);
        }
        setIsModalVisible(false);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setPrice(0); // Reset price on cancel
        seterc20Price(0);
    };

    const onPutHouseForSale = async (tokenId: number) => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }

        if (BuyMyRoomContract) {
            try {
                const priceneedtoshow = web3.utils.toWei(price.toString(), 'ether');
                await BuyMyRoomContract.methods.putHouseForSale(tokenId, priceneedtoshow.toString()).send({ from: account });
                alert('House put for sale successfully!');
                const updatedHouses = await BuyMyRoomContract.methods.getHousesForSale().call();
                const formattedHouses = updatedHouses.map((house: any) => ({
                    tokenId: Number(house.tokenId),
                    owner: house.owner,
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                    ERC20: Number(web3.utils.fromWei(house.price * 10, 'ether'))
                }));
                setHouses(formattedHouses);
            } catch (error) {
                alert(error);
            }
        }
    };

    const onBuyHouse = async (tokenId: number, paymentMethod: 'ETH' | 'ERC20') => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }
    
        if (BuyMyRoomContract) {
            try {
                const house = houses.find(h => h.tokenId === tokenId);
                if (house) {
                    if (paymentMethod === 'ETH') {
                        await BuyMyRoomContract.methods.buyHouse(tokenId).send({ from: account, value: web3.utils.toWei(house.price.toString(), 'ether') });
                        alert('House purchased successfully with ETH!');
                    } else if (paymentMethod === 'ERC20') {
                        await BuyMyRoomContract.methods.buyHouseWithERC20(tokenId).send({ from: account });
                        alert('House purchased successfully with ERC20!');
                    }
    
                    const updatedHouses = await BuyMyRoomContract.methods.getHousesForSale().call();
                    const formattedHouses = updatedHouses.map((house: any) => ({
                        tokenId: Number(house.tokenId),
                        owner: house.owner,
                        price: Number(web3.utils.fromWei(house.price, 'ether')),
                        erc20Price: Number(web3.utils.fromWei(house.erc20Price, 'ether')) // 新增 ERC20 价格
                    }));
                    setHouses(formattedHouses);
                }
            } catch (error) {
                alert(error);
            }
        }
    };

    const onConvertEthToErc20 = async () => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }
       if(myERC20Contract)
       {
            try {
                const amountInWei = web3.utils.toWei(ethToErc20Amount.toString(), 'ether');
                
                await myERC20Contract.methods.convertEthToErc20().send({ from: account, value: amountInWei });
                alert(`Successfully converted ${ethToErc20Amount} ETH to ERC20 tokens!`);
                // 更新余额
                const updatedBalance = await myERC20Contract.methods.balanceOf(account).call();
                setErc20Balance(Number(web3.utils.fromWei(updatedBalance, 'ether')));
            } catch (error) {
                alert(error);
            }
       }
       else{
        
        }
        
    };

    const onClaimAirdrop = async () => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }

        try {
            await myERC20Contract.methods.airdrop().send({ from: account });
            alert('Airdrop claimed successfully!');
            
            // 更新 ERC20 余额
            const updatedBalance = await myERC20Contract.methods.balanceOf(account).call();
            setErc20Balance(web3.utils.fromWei(Number(updatedBalance), 'ether'));
        } catch (error) {
            alert(error || 'Error claiming airdrop');
        }
    };
    


    return (
        <div className='container'>
            <Image width='100%' height='150px' preview={false} src={Header} />
            <div className='main'>
                <h1>房屋出售系统</h1>
                <div className='account'>
                    {account === '' ? '无用户连接' : account}
                </div>
                <div>
                    <p>ETH 余额: {ethBalance} ETH</p>
                    <p>ERC20 余额: {erc20Balance} ERC20</p>
                </div>
                <div>
                    <UserOutlined /> 当前用户拥有的房产：
                    {accountHouses.map(house => (
                        <div key={house.tokenId} className="house">
                            房产ID: {house.tokenId} <br />
                            拥有者: {house.owner} <br />
                            价格: {house.price.toString()} ETH
                            <Button onClick={() => showModal(house.tokenId)}>出售</Button>
                        </div>
                    ))}
                </div>
                <div>
                    <h2>所有出售中的房产</h2>
                    {houses.map(house => (
                        <div key={house.tokenId} className="house">
                            房产ID: {house.tokenId} <br />
                            拥有者: {house.owner} <br />
                            ETH 价格: {house.price} ETH <br />
                            ERC20 价格: {house.price * 10} ERC20 <br />
                            <Button onClick={() => onBuyHouse(house.tokenId, 'ETH')}>使用 ETH 购买</Button>
                            <Button onClick={() => onBuyHouse(house.tokenId, 'ERC20')}>使用 ERC20 购买</Button> {/* 选择购买方式 */}
                        </div>
                    ))}
                </div>
                <Button onClick={onMintHouse}>铸造新房产</Button>

                <div>
                    <h2>转换 ETH 到 ERC20</h2>
                    <Input
                        type="number"
                        value={ethToErc20Amount}
                        onChange={(e) => setEthToErc20Amount(Number(e.target.value))}
                        placeholder="输入 ETH 数量"
                    />
                    <Button onClick={onConvertEthToErc20}>转换为 ERC20</Button>
                </div>

                <div>
                    <Button onClick={onClaimAirdrop}>获取空投</Button>
                </div>


                {/* Modal for setting the house price */}
                <Modal
                    title="设置房屋价格"
                    visible={isModalVisible}
                    onOk={handleOk}
                    onCancel={handleCancel}
                >
                    <Input
                        type="number"
                        value={price}
                        onChange={(e) => {
                            const ethPrice = Number(e.target.value);
                            setPrice(ethPrice);
                            seterc20Price(ethPrice * 10);
                        }}
                        placeholder="设置房屋价格（以ETH为单位）"
                    />
                </Modal>
            </div>
        </div>
    );
};

export default RealEstatePage;
