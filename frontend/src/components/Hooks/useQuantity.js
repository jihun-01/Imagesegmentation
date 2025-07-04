import { useState } from 'react';

function useQuantity(initial = 1, min = 1, max = 99) {
  const [quantity, setQuantity] = useState(initial);

  const increase = () => setQuantity(q => Math.min(max, q + 1));
  const decrease = () => setQuantity(q => Math.max(min, q - 1));
  const set = (val) => setQuantity(Math.max(min, Math.min(max, Number(val))));

  return { quantity, increase, decrease, set };
}

export default useQuantity; 