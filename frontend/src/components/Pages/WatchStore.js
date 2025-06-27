import ProductCard from '../Common/Productcard/ProductCard';
import popicon from '../Assets/icons/popicon.png';
import homeicon from '../Assets/icons/homeicon.png';
import menuicon from '../Assets/icons/listicon.png';
import likeicon from '../Assets/icons/likeicon.png';
import usericon from '../Assets/icons/usericon.png';
import searchicon from '../Assets/icons/searchicon.png';
import carticon from '../Assets/icons/shppingcarticon.png';
import product from '../../tempdata';




function WatchStore() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-4">
      {/* 상단 타이틀 */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <button><img src={searchicon} alt="searchicon" className='w-6 h-6'/></button>
          <span className="text-2xl font-bold text-center flex-1">Make me <span className="block font-extrabold">BEAUTIFUL</span></span>
          <button><img src={carticon} alt="carticon" className='w-6 h-6'/></button>
        </div>
        {/* 카테고리 바 */}
        <div className="flex gap-1 mb-4">
          <button className="bg-black text-white rounded-xl px-3 py-1 font-bold text-sm flex items-center gap-1 whitespace-nowrap">
            <img src={popicon} alt="popicon" className="w-6 h-6" />
            Popular
          </button>
          <button className="bg-gray-100 text-gray-500 rounded-xl px-3 py-1 text-sm whitespace-nowrap">메탈밴드시계</button>
          <button className="bg-gray-100 text-gray-500 rounded-xl px-3 py-1 text-sm whitespace-nowrap">가죽밴드시계</button>
          <button className="bg-gray-100 text-gray-500 rounded-xl px-3 py-1 text-sm whitespace-nowrap">Armchair</button>
        </div>
        {/* 상품 그리드 */}

        <div className="grid grid-cols-2 gap-4">
          {product.map((p, i) => (
            <ProductCard key={i} image={p.image} name={p.name} price={p.price} id={p.id} />
          ))}
        </div>
      </div>
      {/* 하단 네비게이션 바 */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-lg flex justify-around items-center py-3">
        <button className='flex flex-col items-center'><img src={homeicon} alt="homeicon" className='w-6 h-6'/>홈</button>
        <button className='flex flex-col items-center'><img src={menuicon} alt="menuicon" className='w-6 h-6'/>카테고리</button>
        <button className='flex flex-col items-center'><img src={likeicon} alt="likeicon" className='w-6 h-6'/>찜하기</button>
        <button className='flex flex-col items-center'><img src={usericon} alt="usericon" className='w-6 h-6'/>로그인</button>
      </div>
    </div>
  );
}

export default WatchStore;
