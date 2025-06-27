import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import likeicon from '../Assets/icons/likeicon.png';
import product from '../../tempdata';
import backicon from '../Assets/icons/backicon.png';
import { Link } from 'react-router-dom';

// 별점 컴포넌트
const StarRating = ({ rating }) => (
  <div className="flex items-center">
    <svg className="w-5 h-5 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" /></svg>
    <span className="font-semibold text-gray-800 mr-1">{rating}</span>
  </div>
);

// 상품 상세 컴포넌트
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const item = product.find(p => p.id === Number(id));

  const handleMinus = () => setQuantity(q => Math.max(1, q - 1));
  const handlePlus = () => setQuantity(q => q + 1);

  // 가상 착용 페이지로 이동하는 함수
  const handleVirtualTryOn = () => {
    if (item) {
      navigate('/virtual-wear', {
        state: {
          selectedWatch: {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            description: item.description,
            rating: item.rating,
            reviews: item.reviews
          }
        }
      });
    }
  };

  // 장바구니에 담기 함수 (추후 구현)
  const handleAddToCart = () => {
    // 여기에 장바구니 로직 추가
    alert(`${item.name} ${quantity}개가 장바구니에 담겼습니다!`);
  };

  if (!item) {
    return <div className="p-8 text-center text-gray-500">존재하지 않는 상품입니다.</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-screen">
      {/* 상단 이미지 */}
      <div className="relative bg-white">
        <img src={item.image} alt={item.name} className="w-3/4 h-[400px] mx-28 object-cover rounded-b-3xl" />
        <Link to="/">
          <button className="absolute top-4 left-4 bg-white rounded-xl p-2 shadow">
            <img src={backicon} alt="backicon" className="w-6 h-6" />
          </button>
        </Link>
      </div>
      {/* 상세 정보 */}
      <div className="p-6 flex-1 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-gray-900">{item.name}</h2>
        {/* 가격 */}
        <div className="flex items-center justify-between mb-2">    
          <div className="text-2xl font-bold text-gray-900">{Number(item.price.replace(/,/g, '')).toLocaleString()}<span className="text-lg font-normal">원</span></div>
          {/* 수량 조절 */}
          <span className="flex items-center">
            <button onClick={handlePlus} className="bg-gray-100 rounded-lg px-2 py-1 mx-1 text-xl font-bold">+</button>
            <span className="mx-2 text-lg font-mono">{String(quantity).padStart(2, '0')}</span>
            <button onClick={handleMinus} className="bg-gray-100 rounded-lg px-2 py-1 mx-1 text-xl font-bold">-</button>
          </span>
        </div>
        {/* 별점 및 리뷰 */}
        <div className="flex items-center mb-2">
          <StarRating rating={item.rating} />
          <span className="text-gray-400 ml-1">({item.reviews} reviews)</span>
        </div>
        {/* 설명 */}
        <p className="text-gray-500 text-sm mb-6">{item.description}</p>
        {/* 하단 버튼 */}
        <div className="fixed bottom-8 w-96 flex items-center gap-3 mt-auto">
          <button className="bg-gray-100 rounded-xl p-3 hover:bg-gray-200 transition">
            <img src={likeicon} alt="likeicon" className="w-6 h-6" />
          </button>
          <button 
            onClick={handleVirtualTryOn}
            className="flex-1 bg-blue-600 text-white rounded-xl p-3 font-bold text-lg shadow hover:bg-blue-700 transition"
          >
            착용해 보기
          </button>
          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-black text-white rounded-xl p-3 font-bold text-lg shadow hover:bg-gray-800 transition whitespace-nowrap"
          >
            장바구니에 담기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 