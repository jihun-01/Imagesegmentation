import React from 'react';
import shoppingcarticon from '../../Assets/icons/shppingcarticon.png';
import { Link } from 'react-router-dom';

// 상품 카드 컴포넌트
// props: image(이미지 URL), name(상품명), price(가격)
const ProductCard = ({ image, name, price, id }) => {
  return (
    <div className="h-72 bg-white rounded-2xl shadow-md p-4 flex flex-col  relative">
        <Link to={`/product/${id}`}>
      <img src={image} alt={name} className="w-40 h-40 object-cover rounded-xl mb-4" />
      </Link>
      <div className="h-24 text-gray-700 text-sm mb-1 line-clamp-2">{name}</div>
      <div className="text-xs font-bold mb-2">{price} <span className="text-sm font-normal">원</span></div>
      <button className="absolute bottom-4 right-4 bg-gray-100 rounded-xl p-2">
        <img src={shoppingcarticon} alt="shoppingcarticon" className='w-6 h-6' />
      </button>
    </div>
  );
};

export default ProductCard;
