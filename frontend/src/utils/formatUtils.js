/**
 * 금액 포맷팅 유틸리티 함수들
 */

/**
 * 숫자를 3자리마다 콤마가 있는 원화 형식으로 변환
 * @param {number|string} amount - 금액
 * @returns {string} 포맷된 금액 문자열 (예: "123,456원")
 */
export const formatPrice = (amount) => {
  if (!amount && amount !== 0) return '0원';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0원';
  
  return numAmount.toLocaleString('ko-KR') + '원';
};

/**
 * 숫자를 3자리마다 콤마가 있는 형식으로 변환 (원화 표시 없이)
 * @param {number|string} amount - 금액
 * @returns {string} 포맷된 숫자 문자열 (예: "123,456")
 */
export const formatNumber = (amount) => {
  if (!amount && amount !== 0) return '0';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';
  
  return numAmount.toLocaleString('ko-KR');
}; 