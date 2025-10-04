import React, { useState, useMemo } from 'react';
import './ProductCard.css';

function ProductCard({ product }) {
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Renk sırası: yellow -> white -> rose (yalnızca mevcut olanları göster)
  const colors = ['yellow', 'white', 'rose'].filter(
    (c) => product.images && product.images[c]
  );

  const currentImageUrl = useMemo(() => {
    return product.images[selectedColor] || product.images.yellow;
  }, [selectedColor, product.images]);

  const getMetalLabel = (color) =>
    color.charAt(0).toUpperCase() + color.slice(1) + ' Gold';

  // Fraksiyonel yıldız
  const Stars = ({ score }) => {
    const pct = Math.max(0, Math.min(100, (score / 5) * 100));
    return (
      <span className="stars" aria-label={`${score.toFixed(1)}/5`}>
        <span className="stars-bg">★★★★★</span>
        <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
    );
  };

  return (
    <div className="product-card">
      {/* Görsel */}
      <div className="product-image-container">
        <img
          src={currentImageUrl}
          alt={`${product.name} - ${selectedColor} gold`}
          className="product-image"
          loading="lazy"
        />
      </div>

      {/* Detaylar */}
      <div className="product-details">
        <h2 className="product-name" title={product.name}>
          {product.name}
        </h2>

        <p className="product-price">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
            .format(product.price)}{' '}
          <span>USD</span>
        </p>

        {/* Renk Seçici */}
        <div className="color-picker">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-swatch ${color} ${selectedColor === color ? 'selected' : ''}`}
              onClick={() => setSelectedColor(color)}
              title={getMetalLabel(color)}
              aria-label={getMetalLabel(color)}
            />
          ))}
          <span className="metal-label">{getMetalLabel(selectedColor)}</span>
        </div>

        {/* Popülerlik */}
        <div className="popularity-score">
          <Stars score={product.popularityScore5} />
          <span className="score-text">{product.popularityScore5.toFixed(1)}/5</span>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
