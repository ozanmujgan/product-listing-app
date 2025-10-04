import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ProductCard from './ProductCard';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const containerRef = useRef(null);
  const gridRef      = useRef(null);

  // Drag / swipe state
  const isDown    = useRef(false);
  const startX    = useRef(0);
  const scrollL   = useRef(0);

  // Yardımcı: clientX değerini al (mouse/touch)
  const getClientX = (e) => (e.touches && e.touches[0]?.clientX) ?? e.clientX ?? 0;

  useEffect(() => {
    // Ürünleri backend'den al
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/products');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('API hatası:', err);
        setError('Ürünler yüklenirken bir hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Oklarla kaydır
  const scrollGrid = (direction) => {
    if (!gridRef.current) return;
    const scrollAmount = 300;
    gridRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Drag / swipe olayları
  const onPointerDown = (e) => {
    if (!gridRef.current) return;
    isDown.current = true;
    gridRef.current.classList.add('dragging');
    startX.current  = getClientX(e);
    scrollL.current = gridRef.current.scrollLeft;
  };
  const onPointerMove = (e) => {
    if (!isDown.current || !gridRef.current) return;
    const x = getClientX(e);
    gridRef.current.scrollLeft = scrollL.current - (x - startX.current);
  };
  const onPointerUp = () => {
    isDown.current = false;
    gridRef.current?.classList.remove('dragging');
  };

  // Okların tam kenara oturması için container genişliğini değişkene yaz
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const applyWidth = () => {
      el.style.setProperty('--container-w', `${el.clientWidth}px`);
    };
    applyWidth();
    window.addEventListener('resize', applyWidth);
    return () => window.removeEventListener('resize', applyWidth);
  }, []);

  // Klavye ile kaydırma
  useEffect(() => {
    const h = (e) => {
      if (!gridRef.current) return;
      if (e.key === 'ArrowLeft')  scrollGrid('left');
      if (e.key === 'ArrowRight') scrollGrid('right');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (loading) return <div className="loading-message">Ürünler yükleniyor...</div>;
  if (error)   return <div className="error-message">Hata: {error}</div>;

  return (
    <div className="product-listing-app">
      <h1 className="product-list-header">Product List</h1>

      <div className="carousel-container" ref={containerRef}>
        {/* Sol Ok */}
        <button
          type="button"
          className="navigation-arrow left-arrow"
          onClick={() => scrollGrid('left')}
          aria-label="Sola kaydır"
        >
          {'<'}
        </button>

        {/* Ürün Listesi */}
        <div
          className="product-grid"
          ref={gridRef}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Sağ Ok */}
        <button
          type="button"
          className="navigation-arrow right-arrow"
          onClick={() => scrollGrid('right')}
          aria-label="Sağa kaydır"
        >
          {'>'}
        </button>
      </div>

      <div className="separator-line"></div>
    </div>
  );
}

export default App;
