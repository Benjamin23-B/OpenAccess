'use client';

import React from 'react';

export default function AccessibilityHeader() {
  const handleSkipToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        onClick={handleSkipToContent}
        className="skip-link"
        aria-label="Skip to main content"
      >
        Skip to Main Content
      </a>
      
      <header className="accessibility-header" role="banner">
        <div className="header-content">
          <h1 className="header-title">
            <span className="header-icon" aria-hidden="true">🌐</span>
            Niral Thiruvizha - Accessibility Platform
          </h1>
          <p className="header-subtitle" id="page-description">
            Empowering communication through technology
          </p>
        </div>
      </header>
    </>
  );
}
