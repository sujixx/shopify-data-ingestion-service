import React, { useState } from 'react';
import { shopifyAPI } from '../../services/api';
import './StoreConnection.css';

function StoreConnection() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    
    if (!shopDomain) {
      setMessage('Please enter your Shopify domain');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      // First connect the domain to the tenant
      await shopifyAPI.connectStore(shopDomain);
      
      // Then redirect to Shopify OAuth
      shopifyAPI.startAuth(shopDomain);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to connect store');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-connection">
      <h3>Connect Your Shopify Store</h3>
      <p>Enter your Shopify domain to connect your store and start syncing data</p>
      
      {message && <div className="message">{message}</div>}
      
      <form onSubmit={handleConnect}>
        <div className="form-group">
          <label htmlFor="shopDomain">Shopify Domain</label>
          <input
            type="text"
            id="shopDomain"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="your-store.myshopify.com"
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="connect-button"
        >
          {loading ? 'Connecting...' : 'Connect Store'}
        </button>
      </form>
    </div>
  );
}

export default StoreConnection;