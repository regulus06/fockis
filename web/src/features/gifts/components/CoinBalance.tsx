interface Props {

coins:number;

}



export default function CoinBalance({

coins

}:Props){


return (

<div className="coin-balance">

💰 {coins.toLocaleString()} Coins

</div>

);


}