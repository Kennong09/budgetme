import React, { useState, FC, FormEvent, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "animate.css";
import "../../assets/css/landing.css";
import "../../assets/css/dashboard-graphic.css";
import "boxicons/css/boxicons.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Header from "./Header";
import Footer from "./Footer";
import {
  TransactionsAnimation,
  BudgetsAnimation,
  GoalsAnimation,
  FamilyAnimation,
  AIPredictionsAnimation,
} from "./ModuleAnimations";
// Google Icon as inline SVG component for Vite compatibility
const GoogleIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" {...props}>
    <path fill="#fff" d="M44.59 4.21a63.28 63.28 0 004.33 120.9 67.6 67.6 0 0032.36.35 57.13 57.13 0 0025.9-13.46 57.44 57.44 0 0016-26.26 74.33 74.33 0 001.61-33.58H65.27v24.69h34.47a29.72 29.72 0 01-12.66 19.52 36.16 36.16 0 01-13.93 5.5 41.29 41.29 0 01-15.1 0A37.16 37.16 0 0144 95.74a39.3 39.3 0 01-14.5-19.42 38.31 38.31 0 010-24.63 39.25 39.25 0 019.18-14.91A37.17 37.17 0 0176.13 27a34.28 34.28 0 0113.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.22 61.22 0 0087.2 4.59a64 64 0 00-42.61-.38z"/>
    <path fill="#e33629" d="M44.59 4.21a64 64 0 0142.61.37 61.22 61.22 0 0120.35 12.62c-2 2.14-4.11 4.14-6.15 6.22Q95.58 29.23 89.77 35a34.28 34.28 0 00-13.64-8 37.17 37.17 0 00-37.46 9.74 39.25 39.25 0 00-9.18 14.91L8.76 35.6A63.53 63.53 0 0144.59 4.21z"/>
    <path fill="#f8bd00" d="M3.26 51.5a62.93 62.93 0 015.5-15.9l20.73 16.09a38.31 38.31 0 000 24.63q-10.36 8-20.73 16.08a63.33 63.33 0 01-5.5-40.9z"/>
    <path fill="#587dbd" d="M65.27 52.15h59.52a74.33 74.33 0 01-1.61 33.58 57.44 57.44 0 01-16 26.26c-6.69-5.22-13.41-10.4-20.1-15.62a29.72 29.72 0 0012.66-19.54H65.27c-.01-8.22 0-16.45 0-24.68z"/>
    <path fill="#319f43" d="M8.75 92.4q10.37-8 20.73-16.08A39.3 39.3 0 0044 95.74a37.16 37.16 0 0014.08 6.08 41.29 41.29 0 0015.1 0 36.16 36.16 0 0013.93-5.5c6.69 5.22 13.41 10.4 20.1 15.62a57.13 57.13 0 01-25.9 13.47 67.6 67.6 0 01-32.36-.35 63 63 0 01-23-11.59A63.73 63.73 0 018.75 92.4z"/>
  </svg>
);
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import EmailVerificationModal from "../auth/EmailVerificationModal";
import { supabase } from "../../utils/supabaseClient";

// Add testimonial styling
const testimonialStyles = `
  /* Testimonials Section Styling */
  .testimonials-section {
    position: relative;
    padding: 100px 0;
    overflow: hidden;
    background: linear-gradient(180deg, #f8faff 0%, #ffffff 100%);
  }
  
  .testimonials-container {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    z-index: 1;
  }
  
  .testimonials-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    overflow: hidden;
  }
  
  .bg-shape {
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;
  }
  
  .bg-shape-1 {
    top: -150px;
    right: -100px;
    width: 400px;
    height: 400px;
    background: rgba(255, 255, 255, 0.8);
  }
  
  .bg-shape-2 {
    bottom: -100px;
    left: -150px;
    width: 350px;
    height: 350px;
    background: rgba(255, 255, 255, 0.8);
  }
  
  .bg-shape-3 {
    top: 40%;
    right: 15%;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.8);
    opacity: 0.2;
  }
  
  .heading-accent {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  
  .accent-line {
    height: 1px;
    width: 40px;
    background-color: #4f72ff;
  }
  
  .accent-text {
    margin: 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #4f72ff;
    letter-spacing: 2px;
  }
  
  .section-subheading {
    max-width: 600px;
    margin: 0 auto 40px;
    color: #64748b;
  }
  
  /* Testimonial Carousel */
  .testimonial-carousel {
    position: relative;
    display: flex;
    align-items: center;
    margin: 60px 0 40px;
    width: 100%;
  }
  
  .testimonial-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    z-index: 5;
    transition: all 0.3s ease;
  }
  
  .testimonial-navigation:hover {
    background: #4f72ff;
    color: white;
    transform: translateY(-2px);
  }
  
  .testimonial-navigation.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .testimonial-navigation i {
    font-size: 24px;
  }
  
  .testimonial-viewport {
    flex: 1;
    overflow: hidden;
    margin: 0 16px;
  }
  
  .testimonial-slider {
    display: flex;
    width: 100%;
    transition: transform 0.5s ease;
  }
  
  .testimonial-slide {
    min-width: 100%;
    padding: 0 12px;
  }
  
  /* Testimonial Cards */
  .testimonial-card.modern {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    padding: 32px;
    transition: all 0.3s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .testimonial-card.modern:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 40px rgba(79, 114, 255, 0.15);
  }
  
  .testimonial-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  
  .testimonial-category .category-badge {
    display: inline-block;
    padding: 6px 14px;
    background-color: #f0f4ff;
    color: #4f72ff;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }
  
  .testimonial-rating {
    display: flex;
    color: #ffb400;
    font-size: 18px;
  }
  
  .testimonial-rating i {
    margin-left: 2px;
  }
  
  .testimonial-content {
    flex: 1;
    position: relative;
  }
  
  .quote-icon {
    font-size: 24px;
    color: #4f72ff;
    opacity: 0.2;
    margin-bottom: 8px;
  }
  
  .testimonial-text {
    font-size: 16px;
    line-height: 1.7;
    color: #334155;
    margin-bottom: 24px;
  }
  
  .testimonial-highlight {
    margin-top: auto;
    margin-bottom: 24px;
  }
  
  .highlight-badge {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: linear-gradient(135deg, rgba(79, 114, 255, 0.1) 0%, rgba(59, 91, 219, 0.1) 100%);
    border-left: 3px solid #4f72ff;
    border-radius: 4px;
    color: #3b5bdb;
    font-weight: 600;
    font-size: 14px;
  }
  
  .highlight-badge i {
    margin-right: 8px;
  }
  
  .testimonial-author {
    display: flex;
    align-items: center;
    margin-top: auto;
  }
  
  .author-avatar {
    position: relative;
    margin-right: 16px;
  }
  
  .author-avatar img {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .avatar-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: #10b981;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    border: 2px solid white;
  }
  
  .author-info h4 {
    font-size: 16px;
    margin: 0 0 4px;
    color: #1e293b;
  }
  
  .author-info p {
    font-size: 14px;
    margin: 0;
    color: #64748b;
  }
  
  /* Pagination */
  .testimonial-pagination {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  
  .pagination-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    background-color: #cbd5e1;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .pagination-dot.active {
    background-color: #4f72ff;
    transform: scale(1.2);
  }
  
  .pagination-dot:hover:not(.active) {
    background-color: #94a3b8;
  }
  
  /* CTA */
  .testimonial-cta {
    text-align: center;
    margin-top: 60px;
  }
  
  .testimonial-cta p {
    font-size: 18px;
    color: #334155;
    margin-bottom: 16px;
  }
  
  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .testimonials-section {
      padding: 60px 0;
    }
    
    .testimonial-card.modern {
      padding: 24px;
    }
    
    .testimonial-text {
      font-size: 15px;
    }
    
    .testimonial-navigation {
      width: 40px;
      height: 40px;
    }
  }
  
  @media (max-width: 480px) {
    .testimonial-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .author-avatar img {
      width: 48px;
      height: 48px;
    }
    
    .testimonial-navigation {
      width: 36px;
      height: 36px;
    }
    
    .testimonial-navigation i {
      font-size: 20px;
    }
  }
`;

// Add modern web app modules styling
const moduleStyles = `
  /* Modern Modules Section Styling */
  .modules-section {
    background: linear-gradient(180deg, #FFFFFF 0%, #F6F9FF 100%);
    padding: 100px 0;
    position: relative;
    overflow: hidden;
  }
  
  .modules-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2;
  }
  
  .modules-bg-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: hidden;
  }
  
  .modules-bg-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: 40px 40px;
    background-image: 
      linear-gradient(to right, rgba(79, 114, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(79, 114, 255, 0.03) 1px, transparent 1px);
  }
  
  .module-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.15;
  }
  
  .blob-1 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #4e68f5, #6085ff);
    top: -100px;
    right: -150px;
    opacity: 0.2;
  }
  
  .blob-2 {
    width: 350px;
    height: 350px;
    background: linear-gradient(135deg, #10c789, #00b377);
    bottom: -50px;
    left: -100px;
    opacity: 0.15;
  }
  
  /* Module Cards */
  .modules-showcase {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin: 60px 0;
    position: relative;
    z-index: 2;
  }
  
  .module-app {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: all 0.4s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    height: 400px;
    cursor: pointer;
    z-index: 1;
  }
  
  .module-app:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(79, 114, 255, 0.15);
  }
  
  .module-app.featured {
    grid-column: span 3;
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 360px;
  }
  
  .module-app::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(79, 114, 255, 0.0) 0%, rgba(79, 114, 255, 0.05) 100%);
    opacity: 0;
    z-index: -1;
    transition: opacity 0.3s ease;
    border-radius: 16px;
  }
  
  .module-app:hover::before {
    opacity: 1;
  }
  
  .module-header {
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    transition: background-color 0.3s ease;
    position: relative;
    z-index: 2;
  }
  
  .module-app:hover .module-header {
    background-color: rgba(79, 114, 255, 0.02);
  }
  
  .module-title-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .module-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .module-app:hover .module-icon {
    transform: scale(1.05);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  .module-icon.transactions {
    background: linear-gradient(135deg, #10c789, #00b377);
  }
  
  .module-icon.budgets {
    background: linear-gradient(135deg, #ff9f30, #f7941d);
  }
  
  .module-icon.goals {
    background: linear-gradient(135deg, #ec4899, #d23484);
  }
  
  .module-icon.family {
    background: linear-gradient(135deg, #4e68f5, #3754db);
  }
  
  .module-icon.ai {
    background: linear-gradient(135deg, #945ef1, #7d47e1);
  }
  
  .module-title h3 {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
  }
  
  .module-title p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
  
  .module-action {
    display: flex;
    gap: 8px;
    position: relative;
    z-index: 10;
  }
  
  .module-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.03);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #64748b;
    position: relative;
    overflow: hidden;
  }
  
  .module-action-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: #4f72ff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: width 0.4s ease, height 0.4s ease, opacity 0.4s ease;
    z-index: -1;
  }
  
  .module-action-btn:hover {
    background: transparent;
    color: white;
    transform: translateY(-2px);
  }
  
  .module-action-btn:hover::before {
    width: 150%;
    height: 150%;
    opacity: 1;
  }
  
  .module-action-btn i {
    position: relative;
    z-index: 1;
  }
  
  .module-content {
    flex: 1;
    padding: 16px;
    overflow: hidden;
    position: relative;
    z-index: 2;
    transition: background-color 0.3s ease;
  }
  
  .module-app:hover .module-content {
    background-color: rgba(248, 250, 255, 0.8);
  }
  
  .module-app.featured .module-content {
    padding: 24px;
  }
  
  .module-browser {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: #f8faff;
    display: flex;
    flex-direction: column;
    transition: transform 0.4s ease, box-shadow 0.4s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .module-app:hover .module-browser {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(79, 114, 255, 0.12);
  }
  
  .browser-header {
    height: 32px;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 6px;
  }
  
  .browser-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  
  .browser-dot.red {
    background: #ef4444;
  }
  
  .browser-dot.yellow {
    background: #f59e0b;
  }
  
  .browser-dot.green {
    background: #10b981;
  }
  
  .browser-content {
    flex: 1;
    padding: 12px;
    position: relative;
  }
  
  .module-features {
    margin-top: 24px;
  }
  
  .feature-tag {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(79, 114, 255, 0.08);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    color: #4f72ff;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  
  .feature-tag i {
    margin-right: 4px;
  }
  
  .module-preview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.9;
    transition: opacity 0.3s ease;
  }
  
  .module-app:hover .module-preview {
    opacity: 1;
  }
  
  .module-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.3s ease;
    position: relative;
    z-index: 3;
  }
  
  .module-app:hover .module-footer {
    background-color: rgba(248, 250, 255, 0.9);
    border-top-color: rgba(79, 114, 255, 0.1);
  }
  
  .module-stats {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .module-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #64748b;
    transition: transform 0.3s ease, color 0.3s ease;
  }
  
  .module-app:hover .module-stat {
    color: #334155;
    transform: translateX(3px);
  }
  
  .module-stat i {
    opacity: 0.7;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  
  .module-app:hover .module-stat i {
    opacity: 1;
    transform: scale(1.1);
    color: #4f72ff;
  }
  
  .module-cta {
    font-weight: 500;
    color: #4f72ff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.3s ease;
    position: relative;
    padding: 6px 10px;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .module-cta::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 100%;
    background: rgba(79, 114, 255, 0.1);
    transition: width 0.3s ease;
    z-index: -1;
  }
  
  .module-cta:hover {
    gap: 8px;
    color: #3b5bdb;
  }
  
  .module-cta:hover::before {
    width: 100%;
  }
  
  /* Integration Connection Lines */
  .modules-connections {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
  }
  
  /* Module Switcher */
  .module-switcher {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 40px;
    position: relative;
    z-index: 5;
  }
  
  .module-tab {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    font-weight: 500;
    color: #64748b;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .module-tab i {
    font-size: 18px;
    transition: transform 0.3s ease;
  }
  
  .module-tab::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0;
    background: linear-gradient(135deg, rgba(79, 114, 255, 0.1) 0%, rgba(79, 114, 255, 0) 100%);
    transition: height 0.3s ease;
    z-index: -1;
  }
  
  .module-tab.active {
    background: #4e68f5;
    color: white;
    box-shadow: 0 8px 20px rgba(78, 104, 245, 0.25);
    border-color: transparent;
    transform: scale(1.05);
  }
  
  .module-tab.active i {
    transform: rotate(0deg);
  }
  
  .module-tab:hover:not(.active) {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05);
    color: #4f72ff;
  }
  
  .module-tab:hover:not(.active)::before {
    height: 100%;
  }
  
  .module-tab:hover:not(.active) i {
    transform: rotate(-10deg) scale(1.1);
  }
  
  .module-tab:active {
    transform: scale(0.98);
  }
  
  /* Responsive */
  @media (max-width: 1024px) {
    .modules-showcase {
      grid-template-columns: 1fr 1fr;
    }
    
    .module-app.featured {
      grid-column: span 2;
    }
  }
  
  @media (max-width: 768px) {
    .modules-showcase {
      grid-template-columns: 1fr;
    }
    
    .module-app.featured {
      grid-column: span 1;
      display: flex;
      flex-direction: column;
      height: auto;
    }
    
    .module-switcher {
      flex-wrap: wrap;
    }
  }
`;

// Add button styles to match the image
const buttonStyles = `
  .btn-primary {
    background: #4e68f5;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(78, 104, 245, 0.25);
  }
  
  .btn-primary:hover {
    background: #3754db;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(78, 104, 245, 0.35);
  }
  
  .btn-primary:active {
    transform: translateY(0);
  }
  
  .get-started-large {
    font-size: 16px;
    padding: 14px 28px !important;
    border-radius: 10px;
    font-weight: 600;
    position: relative;
    z-index: 10;
    overflow: hidden;
  }
  
  .get-started-large:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0;
    background: rgba(255, 255, 255, 0.1);
    transition: height 0.3s ease;
    z-index: -1;
  }
  
  .get-started-large:hover:before {
    height: 100%;
  }
  
  .get-started-large i {
    transition: transform 0.3s ease;
  }
  
  .get-started-large:hover i {
    transform: translateX(3px);
  }
  
  /* Mobile-responsive button styling */
  .btn-primary, .btn-secondary {
    width: 100%;
    padding: 14px 20px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .btn-primary {
    background: #4e68f5;
    color: white;
  }
  
  .btn-primary:hover {
    background: #3754db;
    transform: translateY(-1px);
  }
  
  .btn-secondary {
    background: transparent;
    color: #4e68f5;
    border: 2px solid #4e68f5;
  }
  
  .btn-secondary:hover {
    background: #4e68f5;
    color: white;
  }
  
  /* OAuth button styling */
  .oauth-btn {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    color: #374151;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .oauth-btn:hover {
    border-color: #d1d5db;
    background: #f9fafb;
    transform: translateY(-1px);
  }
  
  .oauth-btn svg {
    width: 20px;
    height: 20px;
  }
  
  @media (max-width: 480px) {
    .btn-primary, .btn-secondary {
      padding: 12px 16px;
      font-size: 16px;
    }
    
    .oauth-btn {
      padding: 14px 16px;
      font-size: 16px;
    }
  }
`;

// Add email validation styles
const emailValidationStyles = `
  .input-success {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
  }
  
  .input-success:focus {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
  }
  
  .input-warning {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  .input-warning:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  }
  
  .input-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
  }
  
  .input-error:focus {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
  }
  
  /* Focus states for enhanced inputs */
  .input-with-icon .enhanced-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  
  .input-with-icon .enhanced-input:focus + i {
    color: #4f46e5;
  }
  
  /* Mobile touch improvements */
  @media (max-width: 768px) {
    .input-with-icon .enhanced-input {
      -webkit-appearance: none;
      -webkit-tap-highlight-color: transparent;
    }
    
    .btn-primary:active, .btn-secondary:active {
      transform: translateY(0);
    }
    
    .oauth-btn:active {
      transform: translateY(0);
    }
  }
  
  .success-message {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #10b981;
    margin-top: 4px;
  }
  
  .success-message i {
    font-size: 16px;
  }
  
  .info-message {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #4f72ff;
    margin-top: 4px;
  }
  
  .info-message i {
    font-size: 16px;
  }
  
  /* Enhanced input positioning for icons */
  .input-with-icon {
    position: relative !important;
    display: block !important;
    width: 100%;
  }
  
  /* Left icon positioning - using dedicated class for reliability */
  .input-with-icon .input-icon-left {
    position: absolute !important;
    left: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 10 !important;
    color: #6b7280;
    font-size: 16px !important;
    pointer-events: none;
    line-height: 1;
  }
  
  /* Fallback for i:first-child selector */
  .input-with-icon > i:first-child {
    position: absolute !important;
    left: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 10 !important;
    color: #6b7280;
    font-size: 16px !important;
    pointer-events: none;
    line-height: 1;
  }
  
  /* Input field styling */
  .input-with-icon .enhanced-input {
    width: 100%;
    padding: 12px 45px 12px 40px !important;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
    background-color: #ffffff;
    box-sizing: border-box;
  }
  
  /* When no left icon is present */
  .input-with-icon .enhanced-input.no-left-icon {
    padding-left: 12px !important;
  }
  
  /* Password toggle button */
  .input-with-icon .toggle-password-inline {
    position: absolute !important;
    right: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    z-index: 11 !important;
    transition: all 0.2s ease;
    line-height: 1;
  }
  
  .input-with-icon .toggle-password-inline:hover {
    color: #4f46e5;
    background-color: rgba(79, 70, 229, 0.1);
  }
  
  .input-with-icon .toggle-password-inline i {
    font-size: 16px !important;
    line-height: 1;
  }
  
  /* Spinner containment and mobile fix */
  .input-with-icon .bx-loader-alt {
    position: absolute !important;
    right: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    pointer-events: none;
    width: 16px;
    height: 16px;
    font-size: 16px !important;
    z-index: 10 !important;
  }
  
  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .modal-container {
      margin: 8px !important;
      max-width: calc(100vw - 16px) !important;
      width: calc(100vw - 16px) !important;
      max-height: calc(100vh - 16px) !important;
    }
    
    .modal-body {
      padding: 16px !important;
      max-height: calc(80vh - 120px) !important;
    }
    
    .input-with-icon .enhanced-input {
      font-size: 16px !important;
      padding: 14px 45px 14px 42px !important;
    }
    
    .input-with-icon .enhanced-input.no-left-icon {
      padding-left: 14px !important;
    }
    
    .input-with-icon .input-icon-left,
    .input-with-icon > i:first-child {
      left: 14px !important;
      font-size: 18px !important;
    }
    
    .input-with-icon .toggle-password-inline {
      right: 14px !important;
    }
    
    .input-with-icon .bx-loader-alt {
      right: 14px !important;
      font-size: 16px !important;
    }
  }
  
  @media (max-width: 480px) {
    .modal-container {
      margin: 4px !important;
      max-width: calc(100vw - 8px) !important;
      width: calc(100vw - 8px) !important;
    }
    
    .modal-body {
      padding: 12px !important;
    }
    
    .input-with-icon .enhanced-input {
      padding: 12px 42px 12px 36px;
      font-size: 16px;
    }
    
    .input-with-icon .enhanced-input.no-left-icon {
      padding-left: 12px;
    }
    
    .input-with-icon > i:first-child {
      left: 12px;
      font-size: 14px;
    }
    
    .input-with-icon .toggle-password-inline {
      right: 12px;
    }
    
    .input-with-icon .bx-loader-alt {
      right: 12px;
      font-size: 14px;
    }
  }
  
  /* Spinner animation */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .bx-spin {
    animation: spin 1s linear infinite;
    display: inline-block;
    transform-origin: center center;
    will-change: transform;
    backface-visibility: hidden;
  }
  
  /* Prevent spinner animation inheritance */
  .modal-container, .modal-body, .form-group {
    animation: none !important;
  }
  
  /* Ensure spinners stay within bounds */
  .input-with-icon {
    contain: layout style;
    isolation: isolate;
  }
  
  /* Fallback for browsers without contain support */
  @supports not (contain: layout style) {
    .input-with-icon {
      overflow: hidden;
      transform: translateZ(0);
    }
  }
  
  /* Modal form styling improvements */
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
  }
  
  /* Error and success messages */
  .error-message {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ef4444;
    font-size: 13px;
    margin-top: 6px;
  }
  
  .success-message {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #10b981;
    font-size: 13px;
    margin-top: 6px;
  }
  
  .info-message {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #4f72ff;
    font-size: 13px;
    margin-top: 6px;
  }
  
  /* Modal title responsive styling */
  .modal-title {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 20px;
    text-align: center;
  }
  
  /* Password Strength Validation Styles */
  .password-strength-container {
    margin-top: 8px;
  }
  
  .password-strength-meter {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
  }
  
  .strength-bar {
    height: 4px;
    border-radius: 2px;
    flex: 1;
    background-color: #e2e8f0;
    transition: background-color 0.3s ease;
  }
  
  .strength-bar.weak { background-color: #ef4444; }
  .strength-bar.fair { background-color: #f59e0b; }
  .strength-bar.good { background-color: #3b82f6; }
  .strength-bar.strong { background-color: #10b981; }
  
  .password-strength-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .strength-weak { color: #ef4444; }
  .strength-fair { color: #f59e0b; }
  .strength-good { color: #3b82f6; }
  .strength-strong { color: #10b981; }
  
  .password-requirements {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 12px;
  }
  
  @media (max-width: 480px) {
    .password-requirements {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    
    .modal-title {
      font-size: 20px;
      margin-bottom: 16px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
  }
  
  .requirement-item {
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.3s ease;
  }
  
  .requirement-item.met {
    color: #10b981;
  }
  
  .requirement-item.unmet {
    color: #64748b;
  }
  
  .requirement-item i {
    font-size: 14px;
  }
  
  .password-suggestions {
    margin-top: 8px;
    padding: 8px;
    background: rgba(79, 114, 255, 0.05);
    border-radius: 6px;
    border-left: 3px solid #4f72ff;
  }
  
  .suggestions-title {
    font-size: 12px;
    font-weight: 600;
    color: #4f72ff;
    margin-bottom: 4px;
  }
  
  .suggestions-list {
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }
`;

interface LandingPageProps {
  activeTab?: string;
}

const LandingPage: FC<LandingPageProps> = ({ activeTab }) => {
  const { 
    signIn, 
    signUp, 
    resetUserPassword, 
    signInWithOAuth, 
    loading, 
    error,
    clearError,
    verificationEmail,
    setVerificationEmail,
    showEmailVerificationModal,
    setShowEmailVerificationModal,
    resetPasswordSuccess,
    setResetPasswordSuccess,
    signUpSuccess,
    signInSuccess
  } = useAuth();
  
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [resetEmail, setResetEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [loginPasswordVisible, setLoginPasswordVisible] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [loginError, setLoginError] = useState<string>("");
  const [modalScrollPosition, setModalScrollPosition] = useState<number>(0);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  
  // Email validation states
  const [emailValidation, setEmailValidation] = useState<{
    isValidFormat: boolean;
    isChecking: boolean;
    emailExists: boolean;
    hasBeenChecked: boolean;
  }>({
    isValidFormat: false,
    isChecking: false,
    emailExists: false,
    hasBeenChecked: false,
  });
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Login email validation (format only)
  const [loginEmailValidation, setLoginEmailValidation] = useState<{
    isValidFormat: boolean;
    isChecking: boolean;
    hasBeenChecked: boolean;
  }>({
    isValidFormat: false,
    isChecking: false,
    hasBeenChecked: false,
  });
  const loginEmailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset email validation (format + existence check)
  const [resetEmailValidation, setResetEmailValidation] = useState<{
    isValidFormat: boolean;
    isChecking: boolean;
    emailExists: boolean;
    hasBeenChecked: boolean;
  }>({
    isValidFormat: false,
    isChecking: false,
    emailExists: false,
    hasBeenChecked: false,
  });
  const resetEmailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState<{
    strength: 'weak' | 'fair' | 'good' | 'strong';
    score: number;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    hasMinLength: boolean;
    suggestions: string[];
  }>({
    strength: 'weak',
    score: 0,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
    hasMinLength: false,
    suggestions: [],
  });
  
  // New states for hero section interactivity
  const [chartHovered, setChartHovered] = useState<number | null>(null);
  const [deviceRotation, setDeviceRotation] = useState({ x: 5, y: -10 });
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // New state for feature cards interactivity
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [progressValues, setProgressValues] = useState({
    expenses: 65,
    budgeting: 80,
    goals: 45,
    reports: 90,
    family: 70,
    ai: 55
  });
  
  // New state for testimonials section
  const [activeTestimonial, setActiveTestimonial] = useState<number>(0);
  const [isTestimonialAnimating, setIsTestimonialAnimating] = useState<boolean>(false);
  
  // State for modules section
  const [activeModuleTab, setActiveModuleTab] = useState<string>("all");
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [isModuleExpanded, setIsModuleExpanded] = useState<boolean>(false);
  
  const testimonialData = [
    {
      id: 1,
      name: "Marcus Alexander Roldan",
      occupation: "Small Business Owner",
      image: "/images/marcus.png",
      rating: 5,
      category: "Business",
      text: "BudgetMe helped me save enough for a down payment on my house in just 18 months. The goal tracking feature is fantastic! I've recommended it to all my friends who are trying to save for big purchases.",
      highlight: "Saved $45,000 in 18 months"
    },
    {
      id: 2,
      name: "Edward Baulita",
      occupation: "Freelance Designer",
      image: "/images/placeholder.png",
      rating: 5,
      category: "Freelancer",
      text: "As a freelancer with irregular income, BudgetMe has been a game-changer for managing my finances and tax planning. The visualization tools help me see months ahead and plan accordingly.",
      highlight: "15% increase in savings rate"
    },
    {
      id: 3,
      name: "Mariz Legaspi Diaz",
      occupation: "Marketing Manager",
      image: "/images/mariz.png",
      rating: 4,
      category: "Professional",
      text: "The visual reports helped me identify and cut unnecessary expenses. I'm now saving an extra $400 every month! The family sharing feature has also improved how my partner and I manage our finances.",
      highlight: "Cut monthly expenses by 20%"
    },
    {
      id: 4,
      name: "Kenneth Buela",
      occupation: "Software Engineer",
      image: "/images/kenneth.png",
      rating: 5,
      category: "Tech",
      text: "The AI-powered insights have completely changed how I think about my spending habits. BudgetMe predicted patterns I hadn't noticed and helped me optimize my budget automatically.",
      highlight: "Achieved financial goals 30% faster"
    },
    {
      id: 5,
      name: "Peter Justin Delos Reyes",
      occupation: "Cybersecurity Professional",
      image: "/images/peter.png",
      rating: 5,
      category: "Family",
      text: "As a cybersecurity expert, I'm impressed by how BudgetMe secures our financial data while making it accessible to our family. We've established better savings habits and secured our children's education funds with ease.",
      highlight: "Secured college funds 2 years ahead of schedule"
    }
  ];
  
  // New state for how it works section
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  
  // Refs for the sections for auto-scrolling
  const featuresRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const testimonialsRef = useRef<HTMLElement>(null);
  const modulesRef = useRef<HTMLElement>(null);
  const loginModalRef = useRef<HTMLDivElement>(null);
  const registerModalRef = useRef<HTMLDivElement>(null);
  const forgotPasswordModalRef = useRef<HTMLDivElement>(null);
  
  // Animation states for elements that need to animate on scroll
  const [animatedSections, setAnimatedSections] = useState<{[key: string]: boolean}>({
    features: false,
    howItWorks: false,
    testimonials: false,
    modules: false,
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Email validation functions
  const validateEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_input: email
      });
      
      if (error) {
        console.error('Error checking email:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }, []);

  const debouncedEmailCheck = useCallback((email: string) => {
    // Clear previous timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    const isValidFormat = validateEmailFormat(email);

    // Show loading state immediately for any input
    setEmailValidation(prev => ({
      ...prev,
      isValidFormat,
      isChecking: true,
      emailExists: false,
      hasBeenChecked: false,
    }));

    // Debounce the actual validation by 800ms
    emailCheckTimeoutRef.current = setTimeout(async () => {
      if (!isValidFormat) {
        // If format is invalid, just update the state without checking existence
        setEmailValidation(prev => ({
          ...prev,
          isChecking: false,
          emailExists: false,
          hasBeenChecked: true,
        }));
      } else {
        // If format is valid, check if email exists
        const exists = await checkEmailExists(email);
        setEmailValidation(prev => ({
          ...prev,
          isChecking: false,
          emailExists: exists,
          hasBeenChecked: true,
        }));
      }
    }, 800);
  }, [checkEmailExists]);

  // Password validation functions
  const validatePasswordStrength = useCallback((password: string) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    const hasMinLength = password.length >= 8;
    
    let score = 0;
    const suggestions: string[] = [];
    
    // Calculate score and suggestions
    if (hasMinLength) score += 1;
    else suggestions.push("Use at least 8 characters");
    
    if (hasUppercase) score += 1;
    else suggestions.push("Add uppercase letters (A-Z)");
    
    if (hasLowercase) score += 1;
    else suggestions.push("Add lowercase letters (a-z)");
    
    if (hasNumber) score += 1;
    else suggestions.push("Add numbers (0-9)");
    
    if (hasSymbol) score += 1;
    else suggestions.push("Add symbols (!@#$%^&*)");
    
    // Determine strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 1) strength = 'weak';
    else if (score <= 2) strength = 'fair';
    else if (score <= 3) strength = 'good';
    else strength = 'strong';
    
    return {
      strength,
      score,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
      hasMinLength,
      suggestions,
    };
  }, []);

  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);
    
    // Clear form errors when user starts typing
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
    
    // Clear confirm password error if passwords now match
    if (formErrors.confirmPassword && confirmPassword && newPassword === confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
    
    // Validate password strength immediately
    const validation = validatePasswordStrength(newPassword);
    setPasswordValidation(validation);
  }, [formErrors.password, formErrors.confirmPassword, confirmPassword, validatePasswordStrength]);

  // Login email validation (format only, no existence check)
  const handleLoginEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    
    // Clear form errors and login errors when user starts typing
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
    if (loginError) {
      setLoginError("");
      clearError();
    }
    
    // Clear previous timeout
    if (loginEmailCheckTimeoutRef.current) {
      clearTimeout(loginEmailCheckTimeoutRef.current);
    }

    if (newEmail.length === 0) {
      // Reset validation state when email is empty
      setLoginEmailValidation({
        isValidFormat: false,
        isChecking: false,
        hasBeenChecked: false,
      });
      return;
    }

    // Show loading state immediately for any input
    setLoginEmailValidation(prev => ({
      ...prev,
      isChecking: true,
      hasBeenChecked: false,
    }));

    // Debounce the validation by 500ms (shorter than registration since it's just format checking)
    loginEmailCheckTimeoutRef.current = setTimeout(() => {
      const isValidFormat = validateEmailFormat(newEmail);
      setLoginEmailValidation({
        isValidFormat,
        isChecking: false,
        hasBeenChecked: true,
      });
    }, 500);
  }, [formErrors.email]);

  // Reset email validation (format + existence check) - wants email to exist
  const debouncedResetEmailCheck = useCallback((email: string) => {
    // Clear previous timeout
    if (resetEmailCheckTimeoutRef.current) {
      clearTimeout(resetEmailCheckTimeoutRef.current);
    }

    const isValidFormat = validateEmailFormat(email);

    // Show loading state immediately for any input
    setResetEmailValidation(prev => ({
      ...prev,
      isValidFormat,
      isChecking: true,
      emailExists: false,
      hasBeenChecked: false,
    }));

    // Debounce the actual validation by 800ms
    resetEmailCheckTimeoutRef.current = setTimeout(async () => {
      if (!isValidFormat) {
        // If format is invalid, just update the state without checking existence
        setResetEmailValidation(prev => ({
          ...prev,
          isChecking: false,
          emailExists: false,
          hasBeenChecked: true,
        }));
      } else {
        // If format is valid, check if email exists (for reset, we WANT it to exist)
        const exists = await checkEmailExists(email);
        setResetEmailValidation(prev => ({
          ...prev,
          isChecking: false,
          emailExists: exists,
          hasBeenChecked: true,
        }));
      }
    }, 800);
  }, [checkEmailExists]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
      if (loginEmailCheckTimeoutRef.current) {
        clearTimeout(loginEmailCheckTimeoutRef.current);
      }
      if (resetEmailCheckTimeoutRef.current) {
        clearTimeout(resetEmailCheckTimeoutRef.current);
      }
    };
  }, []);

  // Reset validation states when modals close
  useEffect(() => {
    if (!showRegisterModal && !showLoginModal) {
      setEmailValidation({
        isValidFormat: false,
        isChecking: false,
        emailExists: false,
        hasBeenChecked: false,
      });
      setLoginEmailValidation({
        isValidFormat: false,
        isChecking: false,
        hasBeenChecked: false,
      });
      setPasswordValidation({
        strength: 'weak',
        score: 0,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSymbol: false,
        hasMinLength: false,
        suggestions: [],
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setFormErrors({});
      setLoginError("");
      clearError();
    }
  }, [showRegisterModal, showLoginModal, clearError]);

  // Reset validation states when forgot password modal closes
  useEffect(() => {
    if (!showForgotPasswordModal) {
      setResetEmailValidation({
        isValidFormat: false,
        isChecking: false,
        emailExists: false,
        hasBeenChecked: false,
      });
      setResetEmail("");
      // Clear form errors for reset email
      setFormErrors(prev => ({ ...prev, resetEmail: '' }));
    }
  }, [showForgotPasswordModal]);

  // Handle redirect from PrivateRoute and show login modal
  useEffect(() => {
    const state = location.state as any;
    const queryParams = new URLSearchParams(location.search);
    
    if (state?.showLogin || queryParams.get('login') === 'true') {
      setShowLoginModal(true);
      // Clear the state and query params to prevent the modal from showing again on refresh
      navigate(location.pathname, { replace: true, state: null });
    }
    
    // Handle access denied parameter
    if (queryParams.get('access_denied') === 'true') {
      setShowLoginModal(true);
      showErrorToast("Access denied: You don't have admin privileges");
      // Clear the query params
      navigate(location.pathname, { replace: true });
    }
    
    // Handle error parameter
    if (queryParams.get('error') === 'true') {
      setShowLoginModal(true);
      showErrorToast("An error occurred. Please try logging in again.");
      // Clear the query params
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, showErrorToast]);

  // Use activeTab to show the appropriate modal on initial render
  useEffect(() => {
    if (activeTab === 'login') {
      setShowLoginModal(true);
    } else if (activeTab === 'signup') {
      setShowRegisterModal(true);
    } else if (activeTab === 'reset') {
      setShowForgotPasswordModal(true);
    }
  }, [activeTab]);

  // Handle scroll-triggered animations
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Check if refs are available
      const featuresPosition = featuresRef.current?.offsetTop ?? 0;
      const howItWorksPosition = howItWorksRef.current?.offsetTop ?? 0;
      const testimonialsPosition = testimonialsRef.current?.offsetTop ?? 0;
      const modulesPosition = modulesRef.current?.offsetTop ?? 0;

      // Set animation states based on scroll position
      setAnimatedSections({
        features: scrollPosition > featuresPosition - viewportHeight * 0.8,
        howItWorks: scrollPosition > howItWorksPosition - viewportHeight * 0.8,
        testimonials: scrollPosition > testimonialsPosition - viewportHeight * 0.8,
        modules: scrollPosition > modulesPosition - viewportHeight * 0.8,
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Function to scroll to a section
  const scrollToSection = (sectionRef: React.RefObject<HTMLElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to handle feature card interactions
  const handleFeatureHover = (feature: string) => {
    setHoveredFeature(feature);
  };

  const handleFeatureLeave = () => {
    setHoveredFeature(null);
  };

  const handleFeatureClick = (feature: string, route: string) => {
    setActiveFeature(feature);
    setTimeout(() => {
      navigate(route);
    }, 300);
  };

  // Testimonial navigation functions
  const goToTestimonial = (index: number) => {
    if (isTestimonialAnimating || index === activeTestimonial) return;
    
    setIsTestimonialAnimating(true);
    setActiveTestimonial(index);
    
    // Reset animation state after transition completes
    setTimeout(() => {
      setIsTestimonialAnimating(false);
    }, 500); // Match this with CSS transition duration
  };

  const nextTestimonial = () => {
    const nextIndex = (activeTestimonial + 1) % testimonialData.length;
    goToTestimonial(nextIndex);
  };

  const prevTestimonial = () => {
    const prevIndex = activeTestimonial === 0 ? testimonialData.length - 1 : activeTestimonial - 1;
    goToTestimonial(prevIndex);
  };

  // Auto-advance testimonials
  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      if (!isTestimonialAnimating) {
        nextTestimonial();
      }
    }, 8000); // Change testimonial every 8 seconds
    
    return () => clearInterval(testimonialInterval);
  }, [activeTestimonial, isTestimonialAnimating]);

  // Form validation
  const validateForm = (form: 'login' | 'register' | 'resetPassword'): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (form === 'login' || form === 'register') {
      if (!email) {
        errors.email = "Email is required";
      } else if (form === 'login' && loginEmailValidation.isChecking) {
        errors.email = "Validating email format...";
      } else if (form === 'login' && loginEmailValidation.hasBeenChecked && !loginEmailValidation.isValidFormat) {
        errors.email = "Email address is invalid";
      } else if (form === 'register' && !emailValidation.isValidFormat) {
        errors.email = "Email address is invalid";
      } else if (form === 'register' && emailValidation.hasBeenChecked && emailValidation.emailExists) {
        errors.email = "This email is already registered";
      } else if (form === 'register' && emailValidation.isChecking) {
        errors.email = "Checking email availability...";
      }
      
      if (!password) {
        errors.password = "Password is required";
      } else if (form === 'register' && passwordValidation.strength === 'weak') {
        errors.password = "Please create a stronger password";
      }
    }
    
    if (form === 'register') {
      if (!name) {
        errors.name = "Name is required";
      }
      
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    
    if (form === 'resetPassword') {
      if (!resetEmail) {
        errors.resetEmail = "Email is required";
      } else if (resetEmailValidation.isChecking) {
        errors.resetEmail = "Checking email...";
      } else if (resetEmailValidation.hasBeenChecked && !resetEmailValidation.isValidFormat) {
        errors.resetEmail = "Email address is invalid";
      } else if (resetEmailValidation.hasBeenChecked && resetEmailValidation.isValidFormat && !resetEmailValidation.emailExists) {
        errors.resetEmail = "No account found with this email address";
      }
    }
    
    setFormErrors(errors);
    
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm('login')) return;
    
    // Clear previous errors
    clearError();
    setLoginError("");
    
    try {
      await signIn(email, password);
      
      // If login is successful, close the modal and check if user is admin
      if (signInSuccess) {
        setShowLoginModal(false);
        
        // Check if user is admin and redirect accordingly
        try {
          const { isUserAdmin } = await import('../../utils/adminHelpers');
          const isAdmin = await isUserAdmin();
          
          if (isAdmin) {
            navigate('/admin/dashboard');
          } else {
            navigate('/dashboard');
          }
        } catch (adminCheckError) {
          console.error('Error checking admin status:', adminCheckError);
          // If admin check fails, default to regular dashboard
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };
  
  // Update login error display when AuthContext error changes
  useEffect(() => {
    if (error && showLoginModal) {
      setLoginError(error);
    }
  }, [error, showLoginModal]);

  const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm('register')) return;
    
    clearError();
    try {
      await signUp(email, password, name);
      
      // Close register modal - email verification modal will be shown by AuthContext
      if (signUpSuccess) {
        setShowRegisterModal(false);
        showSuccessToast("Account created successfully!");
      }
    } catch (err) {
      console.error('Registration error:', err);
      // Only show error toast for backend/API errors, not validation errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast("Failed to create account. Please try again.");
      }
    }
  };

  // Handle social login
  const handleSocialLogin = async (provider: string): Promise<void> => {
    clearError();
    setOauthLoading(true);
    
    try {
      // Convert provider string to Provider type
      if (provider === 'google') {
        await signInWithOAuth(provider);
        // Note: OAuth redirects away, so loading state will persist until redirect
      }
    } catch (err) {
      console.error(`${provider} login error:`, err);
      setOauthLoading(false);
      // Only show error toast for backend/API errors
      if (error) {
        showErrorToast(error);
      } else if (err instanceof Error) {
        showErrorToast(err.message);
      } else {
        showErrorToast(`Failed to sign in with ${provider}. Please try again.`);
      }
    }
  };

  // Add autoscroll effect for modals
  useEffect(() => {
    const modalElement = showLoginModal ? loginModalRef.current : registerModalRef.current;
    
    if (modalElement) {
      let lastScrollTop = 0;
      const scrollStep = 30; // Pixels to scroll per animation frame
      let animationFrameId: number | null = null;
      
      const scrollAnimation = () => {
        if (modalElement) {
          const currentScrollTop = modalElement.scrollTop;
          
          if (Math.abs(currentScrollTop - modalScrollPosition) > 5) {
            // Calculate the next scroll position with easing
            const direction = modalScrollPosition > currentScrollTop ? 1 : -1;
            const step = Math.min(scrollStep, Math.abs(modalScrollPosition - currentScrollTop));
            modalElement.scrollTop += direction * step;
            
            // Continue animation
            animationFrameId = requestAnimationFrame(scrollAnimation);
          }
        }
      };
      
      animationFrameId = requestAnimationFrame(scrollAnimation);
      
      // Cleanup
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [modalScrollPosition, showLoginModal, showRegisterModal]);

  // Helper function to handle reset password errors
  const handleResetError = (errorMessage: string) => {
    // Check if it's a rate limiting error
    if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('many') || errorMessage.includes('wait')) {
      showErrorToast(errorMessage);
      
      // Add helpful guidance for rate limited users
      setTimeout(() => {
        if (!resetPasswordSuccess) {
          showErrorToast("💡 Tip: Password reset emails may take a few minutes to arrive. Check your spam folder too!");
        }
      }, 4000);
    } else if (errorMessage.includes('invalid email') || errorMessage.includes('valid email')) {
      showErrorToast(errorMessage);
      // Focus back to email input for correction
      setTimeout(() => {
        const emailInput = document.getElementById('reset-email');
        if (emailInput) emailInput.focus();
      }, 1000);
    } else if (errorMessage.includes('email') && (errorMessage.includes('delivery') || errorMessage.includes('send') || errorMessage.includes('unavailable'))) {
      showErrorToast(errorMessage);
      setTimeout(() => {
        showErrorToast("📧 Please check your spam/junk folder. If the issue persists, contact our support team.");
      }, 3500);
    } else if (errorMessage.includes('confirm') || errorMessage.includes('verify')) {
      showErrorToast(errorMessage);
      setTimeout(() => {
        showErrorToast("ℹ️ Check your inbox for any previous verification emails first.");
      }, 3500);
    } else if (errorMessage.includes('disabled') || errorMessage.includes('unavailable')) {
      showErrorToast(errorMessage);
      setTimeout(() => {
        showErrorToast("🛠️ Service temporarily unavailable. Please try again in a few minutes.");
      }, 3500);
    } else {
      showErrorToast(errorMessage);
      // Generic fallback guidance
      setTimeout(() => {
        if (!resetPasswordSuccess) {
          showErrorToast("💡 Double-check your email address and ensure it's associated with a BudgetMe account.");
        }
      }, 4000);
    }
  };

  // Enhanced forgot password handler with better error handling
  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    console.log('🔄 Password reset initiated for email:', resetEmail);
    
    if (!validateForm('resetPassword')) {
      console.log('❌ Form validation failed');
      return;
    }
    
    console.log('✅ Form validation passed, starting reset process...');
    
    setIsResettingPassword(true);
    clearError();
    
    try {
      const result = await resetUserPassword(resetEmail);

      console.log('📊 Reset result:', result);

      setIsResettingPassword(false);
      
      if (result.success) {
        console.log('🎉 Password reset successful, showing success modal');
        setShowForgotPasswordModal(false);
        setShowResetSuccessModal(true);
        showSuccessToast("Password reset email sent!");
      } else if (result.error) {
        console.log('❌ Password reset error detected:', result.error);
        handleResetError(result.error);
      } else {
        console.log('⚠️ Unexpected state - no error but resetPasswordSuccess is false');
        // Fallback: show success anyway since Supabase did not return an error
        setShowForgotPasswordModal(false);
        setShowResetSuccessModal(true);
        showSuccessToast("Password reset email sent!");
      }
      
    } catch (err) {
      console.error('Password reset error:', err);
      setIsResettingPassword(false);
      
      // Handle unexpected errors that weren't caught by the context
      if (err instanceof Error) {
        showErrorToast(err.message || "Password reset failed. Please try again.");
        setTimeout(() => {
          showErrorToast("🔄 If the problem continues, please refresh the page and try again.");
        }, 3500);
      } else {
        showErrorToast("Unable to send reset email. Please verify your email address and try again.");
        setTimeout(() => {
          showErrorToast("💡 Make sure you're using the email address associated with your BudgetMe account.");
        }, 4000);
      }
    }
  };

  // Function to handle device rotation on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    
    // Calculate mouse position relative to element center
    const xPos = (e.clientX - rect.left) / rect.width - 0.5;
    const yPos = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Set rotation values (limited range)
    setDeviceRotation({
      x: -yPos * 10, // Inverted for natural feeling
      y: xPos * 15
    });
  };
  
  // Function to reset device rotation
  const handleMouseLeave = () => {
    setDeviceRotation({ x: 5, y: -10 });
  };

  // Function to handle tooltip visibility
  const showTooltip = (tooltipId: string) => {
    setActiveTooltip(tooltipId);
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="landing-page">
      {/* Inject testimonial styles */}
      <style dangerouslySetInnerHTML={{ __html: testimonialStyles }} />
      {/* Inject module styles */}
      <style dangerouslySetInnerHTML={{ __html: moduleStyles }} />
      {/* Inject button styles */}
      <style dangerouslySetInnerHTML={{ __html: buttonStyles }} />
      {/* Inject email validation styles */}
      <style dangerouslySetInnerHTML={{ __html: emailValidationStyles }} />
      <Header onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} />
      
      {/* Redesigned Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text animate__animated animate__fadeInUp">
            <div 
              className="logo-hero-container" 
              onClick={() => navigate("/")}
              style={{ cursor: "pointer" }}
            >
              {/* Logo placeholder - replace with actual logo */}
              <div className="brand-logo">
                <div className="logo-icon-hero">
                  <i className="fas fa-wallet"></i>
                </div>
                <div className="logo-text-hero">BudgetMe</div>
              </div>
            </div>
            <h1>
              <span className="gradient-text">Smart Financial</span> 
              <br /> 
              <span className="text-black font-bold">Planning Made Simple</span>
            </h1>
            <p>
              Take control of your finances with our intuitive budgeting tools. 
              Track expenses, set goals, and build wealth with AI-powered insights.
            </p>
            <div className="hero-buttons">
              <button
                className="btn-primary get-started"
                onClick={() => setShowRegisterModal(true)}
              >
                Start For Free <i className="bx bx-right-arrow-alt"></i>
              </button>
              <button
                className="btn-secondary explore-features"
                onClick={() => scrollToSection(featuresRef)}
              >
                <span>See How It Works</span> <i className="bx bx-play-circle"></i>
              </button>
            </div>
            <div className="hero-stats">
              <div 
                className="stat-item"
                onClick={() => setShowRegisterModal(true)}
                onMouseEnter={() => showTooltip('web-based')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-badge">NEW</div>
                <div className="stat-number"><i className="bx bxs-cloud"></i> Web-Based</div>
                <div className="stat-label">No Installation Needed</div>
                {activeTooltip === 'web-based' && (
                  <div className="stat-tooltip">
                    Access your finances from any device with a web browser. No app store, no downloads.
                  </div>
                )}
              </div>
              <div 
                className="stat-item"
                onClick={() => scrollToSection(featuresRef)}
                onMouseEnter={() => showTooltip('cross-platform')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-number"><i className="bx bx-devices"></i> 100%</div>
                <div className="stat-label">Cross-Platform</div>
                {activeTooltip === 'cross-platform' && (
                  <div className="stat-tooltip">
                    Works across desktop, tablet, and mobile on any modern browser.
                  </div>
                )}
              </div>
              <div 
                className="stat-item"
                onClick={() => navigate("/security")}
                onMouseEnter={() => showTooltip('secure')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-number"><i className="bx bxs-lock-alt"></i> 256-bit</div>
                <div className="stat-label">Secure Encryption</div>
                {activeTooltip === 'secure' && (
                  <div className="stat-tooltip">
                    Bank-level security with end-to-end encryption keeps your financial data safe.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div 
            className="hero-visual animate__animated animate__fadeInRight"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="hero-graphic">
              <div className="hero-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
              </div>
              
              {/* Floating Icons */}
              <div className="floating-elements">
                <div className="floating-element fe-1">
                  <i className="bx bx-dollar-circle"></i>
                </div>
                <div className="floating-element fe-2">
                  <i className="bx bx-trending-up"></i>
                </div>
                <div className="floating-element fe-3">
                  <i className="bx bx-target-lock"></i>
                </div>
              </div>
              
              <div className="apple-device-mockup" style={{ 
                transform: `perspective(800px) rotateX(${deviceRotation.x}deg) rotateY(${deviceRotation.y}deg)` 
              }}>
                {/* iPhone Screen */}
                <div className="device-screen">
                  <div className="screen-content">
                    {/* iOS Status Bar */}
                    <div className="ios-status-bar">
                      <div className="status-left">
                        <span className="status-time">9:41</span>
                      </div>
                      <div className="status-right">
                        <div className="status-icons">
                          <i className="bx bx-signal-5"></i>
                          <i className="bx bx-wifi"></i>
                          <i className="bx bx-battery"></i>
                        </div>
                      </div>
                    </div>
                    
                    <div className="screen-header">
                      <div className="screen-title">Your Dashboard</div>
                      <div className="screen-date">July 2025</div>
                    </div>
                    <div className="screen-cards">
                      <div 
                        className="screen-card"
                        onClick={() => setShowRegisterModal(true)}
                      >
                        <div className="card-label">Income</div>
                        <div className="card-amount">$4,250</div>
                        <div className="card-trend up">+12%</div>
                      </div>
                      <div 
                        className="screen-card"
                        onClick={() => setShowRegisterModal(true)}
                      >
                        <div className="card-label">Expenses</div>
                        <div className="card-amount">$2,870</div>
                        <div className="card-trend down">-5%</div>
                      </div>
                    </div>
                    <div className="screen-chart">
                      <div 
                        className="chart-bar" 
                        style={{ 
                          height: chartHovered === 0 ? '70%' : '60%',
                          opacity: chartHovered !== null && chartHovered !== 0 ? 0.6 : 1 
                        }}
                        onMouseEnter={() => setChartHovered(0)}
                        onMouseLeave={() => setChartHovered(null)}
                      ></div>
                      <div 
                        className="chart-bar" 
                        style={{ 
                          height: chartHovered === 1 ? '90%' : '80%',
                          opacity: chartHovered !== null && chartHovered !== 1 ? 0.6 : 1
                        }}
                        onMouseEnter={() => setChartHovered(1)}
                        onMouseLeave={() => setChartHovered(null)}
                      ></div>
                      <div 
                        className="chart-bar" 
                        style={{ 
                          height: chartHovered === 2 ? '50%' : '40%',
                          opacity: chartHovered !== null && chartHovered !== 2 ? 0.6 : 1
                        }}
                        onMouseEnter={() => setChartHovered(2)}
                        onMouseLeave={() => setChartHovered(null)}
                      ></div>
                      <div 
                        className="chart-bar" 
                        style={{ 
                          height: chartHovered === 3 ? '100%' : '90%',
                          opacity: chartHovered !== null && chartHovered !== 3 ? 0.6 : 1
                        }}
                        onMouseEnter={() => setChartHovered(3)}
                        onMouseLeave={() => setChartHovered(null)}
                      ></div>
                      <div 
                        className="chart-bar" 
                        style={{ 
                          height: chartHovered === 4 ? '80%' : '70%',
                          opacity: chartHovered !== null && chartHovered !== 4 ? 0.6 : 1
                        }}
                        onMouseEnter={() => setChartHovered(4)}
                        onMouseLeave={() => setChartHovered(null)}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* iPhone Side Buttons */}
                <div className="device-buttons">
                  <div className="button-volume-up"></div>
                  <div className="button-volume-down"></div>
                  <div className="button-power"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Features Section */}
      <section ref={featuresRef} id="features" className={`features-section features-section-features ${animatedSections.features ? 'section-animated' : ''}`}>
        <div className="features-wrapper">
          <div className="section-heading">
            <div className="heading-accent">
              <span className="accent-line"></span>
              <span className="accent-text">FEATURES</span>
              <span className="accent-line"></span>
            </div>
            <h2>Powerful Financial Tools</h2>
            <p>Designed to simplify your financial life with intuitive features</p>
          </div>

          <div className="features-grid">
            {/* Feature Card 1 - Expense Tracking */}
            <div 
              className={`feature-card ${hoveredFeature && hoveredFeature !== 'expenses' ? 'feature-dimmed' : ''} ${activeFeature === 'expenses' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp' : ''}`}
              onClick={() => handleFeatureClick('expenses', "/features/expense-tracking")}
              onMouseEnter={() => handleFeatureHover('expenses')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-icon-wrapper blue">
                <i className="bx bxs-wallet-alt"></i>
              </div>
              <h3>Expense Tracking</h3>
              <p>Track all your transactions with smart categorization and real-time insights.</p>
              <div className="feature-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.expenses}%` }}></div>
                </div>
                <span className="progress-label">Easy to use</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Automatic categorization</li>
                <li><i className="bx bx-check"></i> Receipt scanning</li>
                <li><i className="bx bx-check"></i> Spending analytics</li>
              </ul>
              <div className="feature-cta">
                <span>Learn more</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>

            {/* Feature Card 2 - Smart Budgeting */}
            <div 
              className={`feature-card ${hoveredFeature && hoveredFeature !== 'budgeting' ? 'feature-dimmed' : ''} ${activeFeature === 'budgeting' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
              onClick={() => handleFeatureClick('budgeting', "/features/smart-budgeting")}
              onMouseEnter={() => handleFeatureHover('budgeting')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-icon-wrapper green">
                <i className="bx bxs-pie-chart-alt-2"></i>
              </div>
              <h3>Smart Budgeting</h3>
              <p>Create budgets and get notifications to stay on track with your spending.</p>
              <div className="feature-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.budgeting}%` }}></div>
                </div>
                <span className="progress-label">Smart alerts</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Flexible budget categories</li>
                <li><i className="bx bx-check"></i> Spending alerts</li>
                <li><i className="bx bx-check"></i> Monthly rollover</li>
              </ul>
              <div className="feature-cta">
                <span>Learn more</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>

            {/* Feature Card 3 - Financial Goals */}
            <div 
              className={`feature-card ${hoveredFeature && hoveredFeature !== 'goals' ? 'feature-dimmed' : ''} ${activeFeature === 'goals' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp animation-delay-400' : ''}`}
              onClick={() => handleFeatureClick('goals', "/features/financial-goals")}
              onMouseEnter={() => handleFeatureHover('goals')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-icon-wrapper orange">
                <i className="bx bxs-flag-alt"></i>
              </div>
              <h3>Financial Goals</h3>
              <p>Set and track your savings goals with visual progress tracking and timeline projections.</p>
              <div className="feature-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.goals}%` }}></div>
                </div>
                <span className="progress-label">Visual tracking</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Goal categories</li>
                <li><i className="bx bx-check"></i> Progress tracking</li>
                <li><i className="bx bx-check"></i> Goal analytics</li>
              </ul>
              <div className="feature-cta">
                <span>Learn more</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>

            {/* Feature Card 4 - Financial Reports */}
            <div 
              className={`feature-card ${hoveredFeature && hoveredFeature !== 'reports' ? 'feature-dimmed' : ''} ${activeFeature === 'reports' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp animation-delay-300' : ''}`}
              onClick={() => handleFeatureClick('reports', "/features/financial-reports")}
              onMouseEnter={() => handleFeatureHover('reports')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-icon-wrapper purple">
                <i className="bx bxs-report"></i>
              </div>
              <h3>Financial Reports</h3>
              <p>Get detailed insights into your finances with customizable reports and visualizations.</p>
              <div className="feature-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.reports}%` }}></div>
                </div>
                <span className="progress-label">Data-driven</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Interactive charts</li>
                <li><i className="bx bx-check"></i> Custom date ranges</li>
                <li><i className="bx bx-check"></i> Export capabilities</li>
              </ul>
              <div className="feature-cta">
                <span>Learn more</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>

            {/* Feature Card 5 - Family Sharing */}
            <div 
              className={`feature-card ${hoveredFeature && hoveredFeature !== 'family' ? 'feature-dimmed' : ''} ${activeFeature === 'family' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp animation-delay-500' : ''}`}
              onClick={() => handleFeatureClick('family', "/features/family-sharing")}
              onMouseEnter={() => handleFeatureHover('family')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-icon-wrapper red">
                <i className="bx bxs-user-account"></i>
              </div>
              <h3>Family Sharing</h3>
              <p>Collaborate on finances with family members while maintaining privacy control.</p>
              <div className="feature-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.family}%` }}></div>
                </div>
                <span className="progress-label">Collaboration</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Shared budgets</li>
                <li><i className="bx bx-check"></i> Transaction approval</li>
                <li><i className="bx bx-check"></i> Privacy settings</li>
              </ul>
              <div className="feature-cta">
                <span>Learn more</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>

            {/* Feature Card 6 - AI Insights with enhanced premium styling */}
            <div 
              className={`feature-card premium ${hoveredFeature && hoveredFeature !== 'ai' ? 'feature-dimmed' : ''} ${activeFeature === 'ai' ? 'feature-active' : ''} ${animatedSections.features ? 'animate__animated animate__fadeInUp animation-delay-600' : ''}`}
              onClick={() => handleFeatureClick('ai', "/features/ai-insights")}
              onMouseEnter={() => handleFeatureHover('ai')}
              onMouseLeave={handleFeatureLeave}
            >
              <div className="feature-badge" style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <i className="bx bx-brain" style={{
                  animation: 'none',
                  transform: 'none',
                  transition: 'none',
                  marginRight: '4px'
                }}></i>Limited
              </div>
              <div className="feature-icon-wrapper teal">
                <i className="bx bx-brain"></i>
              </div>
              <h3>AI Financial Insights</h3>
              <p>Harness the power of artificial intelligence to analyze your spending patterns.</p>
              <div className="feature-progress">
                <div className="progress-bar premium-bar">
                  <div className="progress-fill" style={{ width: `${progressValues.ai}%` }}></div>
                </div>
                <span className="progress-label">Smart predictions</span>
              </div>
              <ul className="feature-list">
                <li><i className="bx bx-check"></i> Predictive spending forecasts</li>
                <li><i className="bx bx-check"></i> Personalized savings suggestions</li>
                <li><i className="bx bx-check"></i> Pattern recognition alerts</li>
              </ul>
              <div 
                className="feature-cta premium-cta"
                onClick={() => navigate("/features/ai-insights")}
                style={{ cursor: "pointer" }}
              >
                <span>Explore AI Features</span>
                <i className="bx bx-right-arrow-alt"></i>
              </div>
              <div className="feature-hover-indicator"></div>
            </div>
          </div>

          <div className="features-footer">
            <button 
              className="btn-primary see-all-features"
              onClick={() => navigate("/features")}
            >
              Explore All Features <i className="bx bx-chevron-right"></i>
            </button>
            <div className="features-highlights">
              <div className="highlight-item">
                <i className="bx bxs-check-shield"></i>
                <span>Bank-level security</span>
              </div>
              <div className="highlight-item">
                <i className="bx bxs-cloud"></i>
                <span>Cloud syncing</span>
              </div>
              <div className="highlight-item">
                <i className="bx bx-devices"></i>
                <span>Cross-platform</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} id="how-it-works" className={`how-it-works-section ${animatedSections.howItWorks ? 'section-animated' : ''}`}>
        <div className="section-heading">
          <div className="heading-accent">
            <span className="accent-line"></span>
            <span className="accent-text">HOW IT WORKS</span>
            <span className="accent-line"></span>
          </div>
          <h2>How BudgetMe Works</h2>
          <p>Start managing your finances in four simple steps</p>
        </div>

        <div className="process-container">
          <div className="process-path">
            <div className="process-line"></div>
            <div className="process-progress" style={{ width: hoveredStep ? `${(parseInt(hoveredStep) / 4) * 100}%` : '25%' }}></div>
          </div>
          
          <div className="process-steps">
            <div 
              className={`process-step ${hoveredStep === '1' || !hoveredStep ? 'process-step-active' : ''} ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
              onMouseEnter={() => setHoveredStep('1')}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div className="process-step-number">
                <span>1</span>
                <div className="process-step-icon">
                  <i className="bx bx-user-plus"></i>
                </div>
              </div>
              <div className="process-step-content">
                <h3>Create Your Account</h3>
                <p>Sign up in seconds with just your email. No credit card required to get started.</p>
                <ul className="process-features">
                  <li><i className="bx bx-check"></i> Free forever basic plan</li>
                  <li><i className="bx bx-check"></i> Secure authentication</li>
                  <li><i className="bx bx-check"></i> Data privacy guaranteed</li>
                </ul>
                <div className="process-action">
                  <button className="btn-process" onClick={() => setShowRegisterModal(true)}>
                    Sign Up Free <i className="bx bx-right-arrow-alt"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div 
              className={`process-step ${hoveredStep === '2' ? 'process-step-active' : ''} ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-300' : ''}`}
              onMouseEnter={() => setHoveredStep('2')}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div className="process-step-number">
                <span>2</span>
                <div className="process-step-icon">
                  <i className="bx bx-money"></i>
                </div>
              </div>
              <div className="process-step-content">
                <h3>Set Up Your Budget</h3>
                <p>Create personalized budgets based on your income and spending habits.</p>
                <ul className="process-features">
                  <li><i className="bx bx-check"></i> Custom categories</li>
                  <li><i className="bx bx-check"></i> Flexible budget periods</li>
                  <li><i className="bx bx-check"></i> Automatic calculations</li>
                </ul>
                <div className="process-action">
                  <button className="btn-process">
                    Learn More <i className="bx bx-right-arrow-alt"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div 
              className={`process-step ${hoveredStep === '3' ? 'process-step-active' : ''} ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-400' : ''}`}
              onMouseEnter={() => setHoveredStep('3')}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div className="process-step-number">
                <span>3</span>
                <div className="process-step-icon">
                  <i className="bx bx-receipt"></i>
                </div>
              </div>
              <div className="process-step-content">
                <h3>Track Expenses</h3>
                <p>Easily record and categorize your daily transactions to stay on budget.</p>
                <ul className="process-features">
                  <li><i className="bx bx-check"></i> Quick entry forms</li>
                  <li><i className="bx bx-check"></i> Receipt scanning</li>
                  <li><i className="bx bx-check"></i> Recurring transactions</li>
                </ul>
                <div className="process-action">
                  <button className="btn-process">
                    See Demo <i className="bx bx-right-arrow-alt"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div 
              className={`process-step ${hoveredStep === '4' ? 'process-step-active' : ''} ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-500' : ''}`}
              onMouseEnter={() => setHoveredStep('4')}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div className="process-step-number">
                <span>4</span>
                <div className="process-step-icon">
                  <i className="bx bx-line-chart"></i>
                </div>
              </div>
              <div className="process-step-content">
                <h3>Analyze & Optimize</h3>
                <p>Get visual insights and AI-powered recommendations to improve your finances.</p>
                <ul className="process-features">
                  <li><i className="bx bx-check"></i> Interactive reports</li>
                  <li><i className="bx bx-check"></i> Spending patterns</li>
                  <li><i className="bx bx-check"></i> Smart suggestions</li>
                </ul>
                <div className="process-action">
                  <button 
                    className="btn-process premium-process"
                    onClick={() => navigate("/features/ai-insights")}
                  >
                    Get Started <i className="bx bx-crown"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="process-summary">
          <div className={`summary-card ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-600' : ''}`}>
            <div className="summary-icon">
              <i className="bx bx-time"></i>
            </div>
            <h4>Quick Setup</h4>
            <p>Get started in under 2 minutes</p>
          </div>
          
          <div className={`summary-card ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-700' : ''}`}>
            <div className="summary-icon">
              <i className="bx bx-devices"></i>
            </div>
            <h4>Cross-Platform</h4>
            <p>Use on any device, anywhere</p>
          </div>
          
          <div className={`summary-card ${animatedSections.howItWorks ? 'animate__animated animate__fadeInUp animation-delay-800' : ''}`}>
            <div className="summary-icon">
              <i className="bx bx-support"></i>
            </div>
            <h4>Full Support</h4>
            <p>Help available when you need it</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Remastered */}
      <section ref={testimonialsRef} id="testimonials" className={`testimonials-testimonials-section ${animatedSections.testimonials ? 'section-animated' : ''}`}>
        <div className="testimonials-container">
          {/* Background Elements */}
          <div className="testimonials-background">
            <div className="bg-shape bg-shape-1"></div>
            <div className="bg-shape bg-shape-2"></div>
            <div className="bg-shape bg-shape-3"></div>
          </div>
          
          <div className="section-heading text-center">
              <div className="heading-accent">
                <span className="accent-line" style={{ backgroundColor: 'white' }}></span>
                <span className="accent-text text-white">TESTIMONIALS</span>
                <span className="accent-line" style={{ backgroundColor: 'white' }}></span>
              </div>
              <h2 className="text-white">Success Stories from Our Users</h2>
              <p className="section-subheading text-white">
                See how BudgetMe has helped thousands of people transform their financial lives
              </p>
            </div>

          {/* Testimonial Carousel */}
          <div className="testimonial-carousel">
            <div className={`testimonial-navigation prev ${activeTestimonial === 0 ? 'disabled' : ''}`} onClick={prevTestimonial}>
              <i className="bx bx-chevron-left"></i>
            </div>
            
            <div className="testimonial-viewport">
              <div 
                className="testimonial-slider"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonialData.map((testimonial, index) => (
                  <div 
                    key={testimonial.id}
                    className={`testimonial-slide ${activeTestimonial === index ? 'active' : ''}`}
                  >
                    <div className="testimonial-card modern">
                      <div className="testimonial-header">
                        <div className="testimonial-category">
                          <span className="category-badge">{testimonial.category}</span>
                        </div>
                        <div className="testimonial-rating">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i 
                              key={i}
                              className={`bx ${i < testimonial.rating ? 'bxs-star' : 'bx-star'}`}
                            ></i>
                          ))}
                        </div>
                      </div>
                      
                      <div className="testimonial-content">
                        <div className="quote-icon">
                          <i className="bx bxs-quote-alt-left"></i>
                        </div>
                        <p className="testimonial-text">"{testimonial.text}"</p>
                        <div className="testimonial-highlight">
                          <div className="highlight-badge">
                            <i className="bx bx-line-chart"></i>
                            <span>{testimonial.highlight}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="testimonial-author">
                        <div className="author-avatar">
                          <img src={testimonial.image} alt={testimonial.name} />
                          <div className="avatar-badge">
                            <i className="bx bxs-check-circle"></i>
                          </div>
                        </div>
                        <div className="author-info">
                          <h4>{testimonial.name}</h4>
                          <p>{testimonial.occupation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`testimonial-navigation next ${activeTestimonial === testimonialData.length - 1 ? 'disabled' : ''}`} onClick={nextTestimonial}>
              <i className="bx bx-chevron-right"></i>
            </div>
          </div>
          
          {/* Testimonial Pagination Indicators */}
          <div className="testimonial-pagination">
            {testimonialData.map((_, index) => (
              <button
                key={index}
                className={`pagination-dot ${activeTestimonial === index ? 'active' : ''}`}
                onClick={() => goToTestimonial(index)}
                aria-label={`Go to testimonial ${index + 1}`}
              ></button>
            ))}
          </div>
          
          <div className="testimonial-cta" style={{ position: 'relative', zIndex: 10 }}>
            <p className="text-white">Ready to start your success story?</p>
            <button 
              className="btn-primary"
              onClick={() => setShowRegisterModal(true)}
              style={{ 
                backgroundColor: 'white', 
                color: 'var(--landing-primary)', 
                position: 'relative', 
                zIndex: 15, 
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              Join BudgetMe Today <i className="bx bx-right-arrow-alt"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Modern Web App Modules Section */}
      <section ref={modulesRef} id="modules" className={`modules-section ${animatedSections.modules ? 'section-animated' : ''}`}>
        <div className="modules-container">
          {/* Background elements */}
          <div className="modules-bg-elements">
            <div className="modules-bg-grid"></div>
            <div className="module-blob blob-1"></div>
            <div className="module-blob blob-2"></div>
          </div>

        <div className="section-heading">
            <div className="heading-accent">
              <span className="accent-line"></span>
              <span className="accent-text">APP MODULES</span>
              <span className="accent-line"></span>
            </div>
            <h2>Web App Experience, Built for Your Finances</h2>
            <p className="section-subheading">
              Explore our powerful modules designed to give you complete control of your financial life
          </p>
        </div>

          {/* Module category tabs */}
          <div className="module-switcher">
            <div 
              className={`module-tab ${activeModuleTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveModuleTab('all')}
            >
              <i className="bx bx-category-alt"></i> All Modules
            </div>
            <div 
              className={`module-tab ${activeModuleTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveModuleTab('personal')}
            >
              <i className="bx bx-user"></i> Personal
            </div>
            <div 
              className={`module-tab ${activeModuleTab === 'family' ? 'active' : ''}`}
              onClick={() => setActiveModuleTab('family')}
            >
              <i className="bx bx-group"></i> Family
            </div>
            <div 
              className={`module-tab ${activeModuleTab === 'premium' ? 'active' : ''}`}
              onClick={() => setActiveModuleTab('premium')}
            >
              <i className="bx bx-crown"></i> Premium
            </div>
          </div>

          {/* Module showcase - app-like interface */}
          <div className="modules-showcase">
            {/* Featured module - spans the full width */}
            <div 
              className={`module-app featured ${animatedSections.modules ? 'animate__animated animate__fadeInUp' : ''}`}
              onMouseEnter={() => setHoveredModule('dashboard')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => setShowRegisterModal(true)}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-content">
                <div className="module-title-area">
                  <div className="module-icon transactions">
                    <i className="bx bxs-dashboard"></i>
                  </div>
                  <div className="module-title">
                    <h3>Smart Dashboard</h3>
                    <p>Your financial command center</p>
                  </div>
                </div>
                
                <p style={{ marginTop: '16px' }}>
                  Get a complete overview of your finances at a glance. Track income, expenses, 
                  and savings goals all in one place with our intuitive dashboard.
                </p>
                
                <div className="module-features">
                  <span className="feature-tag"><i className="bx bx-line-chart"></i> Spending Analytics</span>
                  <span className="feature-tag"><i className="bx bx-trending-up"></i> Income Tracking</span>
                  <span className="feature-tag"><i className="bx bx-calendar"></i> Monthly Overview</span>
                  <span className="feature-tag"><i className="bx bx-bell"></i> Smart Alerts</span>
                </div>
                
                <button 
                  className="btn-primary"
                  style={{ marginTop: '24px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}
                >
                  Try Dashboard <i className="bx bx-right-arrow-alt"></i>
                </button>
              </div>
              
              <div className="module-browser">
                <div className="browser-header">
                  <div className="browser-dot red"></div>
                  <div className="browser-dot yellow"></div>
                  <div className="browser-dot green"></div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                    dashboard.budgetme.app
                  </div>
                </div>
                <div className="browser-content">
                  {/* Always show dashboard preview with enhanced effect on hover */}
                  <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                    <div className={`dashboard-preview ${hoveredModule === 'dashboard' ? 'animate__animated animate__fadeIn' : ''}`} 
                      style={{ 
                        transform: hoveredModule === 'dashboard' ? 'scale(1.05)' : 'scale(1)',
                        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease',
                        opacity: hoveredModule === 'dashboard' ? '1' : '0.9',
                      }}>
                      <TransactionsAnimation animated={hoveredModule === 'dashboard' || animatedSections.modules} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Module */}
            <div 
              className={`module-app ${animatedSections.modules ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
              onMouseEnter={() => setHoveredModule('transactions')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => navigate('/transactions')}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header">
                <div className="module-title-area">
                  <div className="module-icon transactions">
                    <i className="bx bxs-credit-card"></i>
                  </div>
                  <div className="module-title">
                    <h3>Transactions</h3>
                    <p>Track your spending</p>
                  </div>
                </div>
                <div className="module-action">
                  <button className="module-action-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}>
                    <i className="bx bx-info-circle"></i>
                  </button>
                </div>
              </div>
              <div className="module-content">
                {/* Always show a preview with enhanced effect on hover */}
                <div className="module-preview-container" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    transform: hoveredModule === 'transactions' ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    height: '100%',
                    opacity: hoveredModule === 'transactions' ? '1' : '0.9'
                  }}>
                    <TransactionsAnimation animated={hoveredModule === 'transactions' || animatedSections.modules} />
                    
                    {/* Semi-transparent overlay with transaction details */}
                    <div className="module-preview-overlay" style={{ 
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                      opacity: hoveredModule === 'transactions' ? '0' : '1',
                      transform: hoveredModule === 'transactions' ? 'translateY(10px)' : 'translateY(0)',
                      borderLeft: '3px solid #10c789'
                    }}>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>Recent Transactions</div>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Grocery Store</span>
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>-$86.45</span>
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Salary Deposit</span>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>+$2,450.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="module-footer">
                <div className="module-stats">
                  <div className="module-stat">
                    <i className="bx bx-category"></i>
                    <span>Auto categorization</span>
                  </div>
                </div>
                <div 
                  className="module-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/transactions');
                  }}
                >
                  <span>Explore</span>
                  <i className="bx bx-chevron-right"></i>
                </div>
              </div>
            </div>

            {/* Budgets Module */}
            <div 
              className={`module-app ${animatedSections.modules ? 'animate__animated animate__fadeInUp animation-delay-300' : ''}`}
              onMouseEnter={() => setHoveredModule('budgets')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => navigate('/budgets')}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header">
                <div className="module-title-area">
                  <div className="module-icon budgets">
                    <i className="bx bxs-wallet"></i>
                  </div>
                  <div className="module-title">
                    <h3>Budgets</h3>
                    <p>Plan your spending</p>
                  </div>
                </div>
                <div className="module-action">
                  <button className="module-action-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}>
                    <i className="bx bx-info-circle"></i>
                  </button>
                </div>
              </div>
              <div className="module-content">
                {/* Always show a preview with enhanced effect on hover */}
                <div className="module-preview-container" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    transform: hoveredModule === 'budgets' ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    height: '100%',
                    opacity: hoveredModule === 'budgets' ? '1' : '0.9'
                  }}>
                    <BudgetsAnimation animated={hoveredModule === 'budgets' || animatedSections.modules} />
                    
                    {/* Semi-transparent overlay with budget details */}
                    <div className="module-preview-overlay" style={{ 
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                      opacity: hoveredModule === 'budgets' ? '0' : '1',
                      transform: hoveredModule === 'budgets' ? 'translateY(10px)' : 'translateY(0)',
                      borderLeft: '3px solid #ff9f30'
                    }}>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>July Budget</div>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span>Groceries</span>
                          <span>75% used</span>
                        </div>
                                                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ width: '75%', height: '100%', background: '#ff9f30', borderRadius: '3px' }}></div>
                          </div>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span>Entertainment</span>
                          <span>45% used</span>
                        </div>
                                                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ width: '45%', height: '100%', background: '#ff9f30', borderRadius: '3px' }}></div>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="module-footer">
                <div className="module-stats">
                  <div className="module-stat">
                    <i className="bx bx-bell"></i>
                    <span>Budget alerts</span>
                  </div>
                </div>
                <div 
                  className="module-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/budgets');
                  }}
                >
                  <span>Explore</span>
                  <i className="bx bx-chevron-right"></i>
                </div>
              </div>
            </div>

            {/* Goals Module */}
            <div 
              className={`module-app ${animatedSections.modules ? 'animate__animated animate__fadeInUp animation-delay-400' : ''}`}
              onMouseEnter={() => setHoveredModule('goals')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => navigate('/goals')}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header">
                <div className="module-title-area">
                  <div className="module-icon goals">
                    <i className="bx bxs-flag"></i>
                  </div>
                  <div className="module-title">
                    <h3>Financial Goals</h3>
                    <p>Achieve your dreams</p>
                  </div>
                </div>
                <div className="module-action">
                  <button className="module-action-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}>
                    <i className="bx bx-info-circle"></i>
                  </button>
                </div>
              </div>
              <div className="module-content">
                {/* Always show a preview with enhanced effect on hover */}
                <div className="module-preview-container" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    transform: hoveredModule === 'goals' ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    height: '100%',
                    opacity: hoveredModule === 'goals' ? '1' : '0.9'
                  }}>
                    <GoalsAnimation animated={hoveredModule === 'goals' || animatedSections.modules} />
                    
                    {/* Semi-transparent overlay with goal details */}
                    <div className="module-preview-overlay" style={{ 
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                      opacity: hoveredModule === 'goals' ? '0' : '1',
                      transform: hoveredModule === 'goals' ? 'translateY(10px)' : 'translateY(0)',
                      borderLeft: '3px solid #ec4899'
                    }}>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>Savings Goals</div>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: 'rgba(236, 72, 153, 0.1)', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px'
                        }}>
                          <i className="bx bxs-home" style={{ color: '#ec4899', fontSize: '18px' }}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Home Down Payment</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>68%</span>
                          </div>
                          <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px' }}>
                            <div style={{ width: '68%', height: '100%', background: '#ec4899', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="module-footer">
                <div className="module-stats">
                  <div className="module-stat">
                    <i className="bx bx-time"></i>
                    <span>Timeline projections</span>
                  </div>
                </div>
                <div 
                  className="module-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/goals');
                  }}
                >
                  <span>Explore</span>
                  <i className="bx bx-chevron-right"></i>
                </div>
              </div>
            </div>

            {/* Family Module */}
            <div 
              className={`module-app ${animatedSections.modules ? 'animate__animated animate__fadeInUp animation-delay-500' : ''}`}
              onMouseEnter={() => setHoveredModule('family')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => navigate('/family')}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header">
                <div className="module-title-area">
                  <div className="module-icon family">
                    <i className="bx bxs-group"></i>
                  </div>
                  <div className="module-title">
                    <h3>Family Finance</h3>
                    <p>Manage together</p>
                  </div>
                </div>
                <div className="module-action">
                  <button className="module-action-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}>
                    <i className="bx bx-info-circle"></i>
                  </button>
                </div>
              </div>
              <div className="module-content">
                {/* Always show a preview with enhanced effect on hover */}
                <div className="module-preview-container" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    transform: hoveredModule === 'family' ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    height: '100%',
                    opacity: hoveredModule === 'family' ? '1' : '0.9'
                  }}>
                    <FamilyAnimation animated={hoveredModule === 'family' || animatedSections.modules} />
                    
                    {/* Semi-transparent overlay with family members */}
                    <div className="module-preview-overlay" style={{ 
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                      opacity: hoveredModule === 'family' ? '0' : '1',
                      transform: hoveredModule === 'family' ? 'translateY(10px)' : 'translateY(0)',
                      borderLeft: '3px solid #4e68f5'
                    }}>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>Family Members</div>
                      <div style={{ display: 'flex', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#ec4899',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginRight: '6px'
                          }}>JD</div>
                          <span style={{ fontSize: '12px', color: '#334155' }}>You</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#4f72ff',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginRight: '6px'
                          }}>AS</div>
                          <span style={{ fontSize: '12px', color: '#334155' }}>Partner</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="module-footer">
                <div className="module-stats">
                  <div className="module-stat">
                    <i className="bx bx-shield"></i>
                    <span>Privacy controls</span>
                  </div>
                </div>
                <div 
                  className="module-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/family');
                  }}
                >
                  <span>Explore</span>
                  <i className="bx bx-chevron-right"></i>
                </div>
              </div>
            </div>

            {/* AI Predictions Module */}
            <div 
              className={`module-app ${animatedSections.modules ? 'animate__animated animate__fadeInUp animation-delay-600' : ''}`}
              onMouseEnter={() => setHoveredModule('ai')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => navigate('/features/ai-insights')}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header">
                <div className="module-title-area">
                  <div className="module-icon ai">
                    <i className="bx bxs-brain"></i>
                  </div>
                  <div className="module-title">
                    <h3>AI Insights</h3>
                    <p>Smart predictions</p>
                  </div>
                </div>
                <div className="module-action">
                  <button className="module-action-btn" onClick={(e) => {
                    e.stopPropagation();
                    setShowRegisterModal(true);
                  }}>
                    <i className="bx bx-crown"></i>
                  </button>
                </div>
              </div>
              <div className="module-content">
                {/* Always show a preview with enhanced effect on hover */}
                <div className="module-preview-container" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    transform: hoveredModule === 'ai' ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    height: '100%',
                    opacity: hoveredModule === 'ai' ? '1' : '0.9'
                  }}>
                    <AIPredictionsAnimation animated={hoveredModule === 'ai' || animatedSections.modules} />
                    
                    {/* Semi-transparent overlay with AI insights */}
                    <div className="module-preview-overlay" style={{ 
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      right: '10px',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                      opacity: hoveredModule === 'ai' ? '0' : '1',
                      transform: hoveredModule === 'ai' ? 'translateY(10px)' : 'translateY(0)',
                      borderLeft: '3px solid #945ef1'
                    }}>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>AI Insights</div>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        <div style={{ 
                          minWidth: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'rgba(139, 92, 246, 0.1)', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px'
                        }}>
                          <i className="bx bx-bulb" style={{ color: '#8b5cf6', fontSize: '16px' }}></i>
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                          Based on your spending patterns, you could save $240 more each month by adjusting your dining budget.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="module-footer">
                <div className="module-stats">
                  <div className="module-stat">
                    <i className="bx bx-crown"></i>
                    <span>Premium feature</span>
                  </div>
                </div>
                <div 
                  className="module-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/features/ai-insights');
                  }}
                >
                  <span>Upgrade</span>
                  <i className="bx bx-chevron-right"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="cta-container text-center" style={{ position: 'relative', zIndex: 10 }}>
            <div className="feature-badge" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'rgba(78, 104, 245, 0.1)',
              color: '#4e68f5',
              marginBottom: '24px',
              position: 'relative',
              zIndex: 2
            }}>
              <i className="bx bx-laptop" style={{ marginRight: '8px' }}></i>
              <span>Web App Experience</span>
            </div>
            <h3 style={{ marginBottom: '16px', position: 'relative', zIndex: 2 }}>Ready to take control of your finances?</h3>
            <p style={{ marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px', position: 'relative', zIndex: 2 }}>
              Join thousands of users who are already transforming their financial lives with BudgetMe.
            </p>
          <button
            className="btn-primary get-started-large"
            onClick={() => setShowRegisterModal(true)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              position: 'relative', 
              zIndex: 10,
              cursor: 'pointer',
              padding: '12px 24px'
            }}
          >
              <i className="bx bx-rocket"></i>
              <span>Get Started for Free</span>
          </button>
            <div style={{ 
              marginTop: '16px', 
              color: '#64748b', 
              fontSize: '14px',
              position: 'relative',
              zIndex: 2
            }}>
              <i className="bx bx-check-circle" style={{ color: '#10b981', marginRight: '4px' }}></i>
              No credit card required
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowLoginModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowLoginModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={loginModalRef}>
              <h2 className="modal-title text-center mb-6">Welcome Back!</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleLogin(e);
              }}>
                    <div className="form-group">
                      <label htmlFor="login-email">Email</label>
                      <div className={`input-with-icon ${
                        formErrors.email || loginError ? 'input-error' : 
                        loginEmailValidation.hasBeenChecked && !loginEmailValidation.isValidFormat ? 'input-error' : 
                        loginEmailValidation.hasBeenChecked && loginEmailValidation.isValidFormat ? 'input-success' : ''
                      }`}>
                        {!formErrors.email && !loginError && (
                          <i className="bx bx-envelope input-icon-left"></i>
                        )}
                        <input
                          type="email"
                          id="login-email"
                          value={email}
                          onChange={(e) => handleLoginEmailChange(e.target.value)}
                          placeholder="Enter your email"
                          className={`enhanced-input ${
                            formErrors.email || loginError ? 'no-left-icon' : ''
                          }`}
                          required
                        />
                      </div>
                      {formErrors.email && <div className="error-message">{formErrors.email}</div>}
                      {!formErrors.email && loginEmailValidation.isChecking && (
                        <div className="info-message" style={{ color: '#4f72ff', fontSize: '14px', marginTop: '4px' }}>
                          <i className="bx bx-loader-alt bx-spin"></i> Checking email format...
                        </div>
                      )}
                      {!formErrors.email && loginEmailValidation.hasBeenChecked && !loginEmailValidation.isValidFormat && !loginEmailValidation.isChecking && (
                        <div className="error-message">
                          Please enter a valid email address
                        </div>
                      )}
                      {!formErrors.email && loginEmailValidation.hasBeenChecked && loginEmailValidation.isValidFormat && !loginEmailValidation.isChecking && (
                        <div className="success-message" style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                          <i className="bx bx-check-circle"></i> Valid email format
                        </div>
                      )}
                    </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className={`input-with-icon password-field ${formErrors.password || loginError ? 'input-error' : ''}`}>
                    {!formErrors.password && !loginError && (
                      <i className="bx bx-lock-alt input-icon-left"></i>
                    )}
                    <input
                      type={loginPasswordVisible ? "text" : "password"}
                      id="login-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        // Clear form errors and login errors when user starts typing
                        if (formErrors.password) {
                          setFormErrors(prev => ({ ...prev, password: '' }));
                        }
                        if (loginError) {
                          setLoginError("");
                          clearError();
                        }
                      }}
                      placeholder="Enter your password"
                      className={`enhanced-input ${formErrors.password || loginError ? 'no-left-icon' : ''}`}
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setLoginPasswordVisible(!loginPasswordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${loginPasswordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                  </div>
                  {formErrors.password && <div className="error-message">{formErrors.password}</div>}
                  
                  {/* Display login error message */}
                  {!formErrors.password && loginError && (
                    <div className="error-message" style={{ marginTop: '8px' }}>
                      <i className="bx bx-error-circle"></i> {loginError}
                      {loginError.toLowerCase().includes('verify') && loginError.toLowerCase().includes('email') && (
                        <div style={{ marginTop: '8px', fontSize: '13px' }}>
                          <button 
                            type="button" 
                            className="text-btn" 
                            onClick={() => {
                              setShowLoginModal(false);
                              setVerificationEmail(email);
                              setTimeout(() => setShowEmailVerificationModal(true), 300);
                            }}
                            style={{ 
                              textDecoration: 'underline', 
                              color: '#4f72ff',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Resend verification email
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="form-options">
                  <div className="remember-me">
                    <input 
                      type="checkbox" 
                      id="remember-me" 
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="custom-checkbox"
                    />
                    <label htmlFor="remember-me">Remember me</label>
                  </div>
                  <button
                    type="button"
                    className="text-btn forgot-password"
                    onClick={() => {
                      setShowLoginModal(false);
                      setTimeout(() => setShowForgotPasswordModal(true), 300);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <button 
                  type="submit" 
                  className="btn-primary btn-block login-btn" 
                  disabled={loading}
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: loading ? "scale(0.98)" : "scale(1)"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {loading ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Logging In...
                    </>
                  ) : 'Log In'}
                </button>

                <div className="social-login">
                  <p>Or log in with</p>
                  <div className="social-buttons">
                    <button 
                      type="button"
                      className="social-btn google"
                      onClick={() => handleSocialLogin('google')}
                      disabled={oauthLoading || loading}
                    >
                      {oauthLoading ? (
                        <>
                          <div className="oauth-spinner"></div>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <GoogleIcon className="social-icon" />
                          <span>Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Don't have an account?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowLoginModal(false);
                    setTimeout(() => setShowRegisterModal(true), 300);
                  }}
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowRegisterModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={registerModalRef}>
              <h2 className="modal-title text-center mb-6">Join BudgetMe Today</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleRegister(e);
              }}>
                <div className="form-group">
                  <label htmlFor="register-name">Full Name</label>
                  <div className={`input-with-icon ${formErrors.name ? 'input-error' : ''}`}>
                    <i className="bx bx-user input-icon-left"></i>
                    <input
                      type="text"
                      id="register-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="enhanced-input"
                      required
                    />
                  </div>
                  {formErrors.name && <div className="error-message">{formErrors.name}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">Email</label>
                  <div className={`input-with-icon ${formErrors.email ? 'input-error' : emailValidation.hasBeenChecked && (!emailValidation.isValidFormat || emailValidation.emailExists) ? 'input-error' : emailValidation.hasBeenChecked && emailValidation.isValidFormat && !emailValidation.emailExists ? 'input-success' : ''}`}>
                    {!formErrors.email && (
                      <i className="bx bx-envelope input-icon-left"></i>
                    )}
                    <input
                      type="email"
                      id="register-email"
                      value={email}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        setEmail(newEmail);
                        // Clear form errors when user starts typing
                        if (formErrors.email) {
                          setFormErrors(prev => ({ ...prev, email: '' }));
                        }
                        // Trigger debounced email validation
                        if (newEmail.length > 0) {
                          debouncedEmailCheck(newEmail);
                        } else {
                          // Reset validation state when email is empty
                          setEmailValidation({
                            isValidFormat: false,
                            isChecking: false,
                            emailExists: false,
                            hasBeenChecked: false,
                          });
                        }
                      }}
                      placeholder="Enter your email"
                      className={`enhanced-input ${
                        formErrors.email ? 'no-left-icon' : ''
                      }`}
                      required
                    />
                  </div>
                  {formErrors.email && <div className="error-message">{formErrors.email}</div>}
                  {!formErrors.email && emailValidation.hasBeenChecked && !emailValidation.isChecking && !emailValidation.isValidFormat && (
                    <div className="error-message">
                      Please enter a valid email address
                    </div>
                  )}
                  {!formErrors.email && emailValidation.hasBeenChecked && !emailValidation.isChecking && emailValidation.isValidFormat && !emailValidation.emailExists && (
                    <div className="success-message" style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                      <i className="bx bx-check-circle"></i> Email is available
                    </div>
                  )}
                  {!formErrors.email && emailValidation.hasBeenChecked && !emailValidation.isChecking && emailValidation.emailExists && (
                    <div className="error-message">
                      This email is already registered. <button 
                        type="button" 
                        className="text-btn" 
                        onClick={() => {
                          setShowRegisterModal(false);
                          setTimeout(() => setShowLoginModal(true), 300);
                        }}
                        style={{ textDecoration: 'underline', color: 'inherit' }}
                      >
                        Sign in instead?
                      </button>
                    </div>
                  )}
                  {!formErrors.email && emailValidation.isChecking && (
                    <div className="info-message" style={{ color: '#4f72ff', fontSize: '14px', marginTop: '4px' }}>
                      <i className="bx bx-loader-alt bx-spin"></i> Checking email availability...
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <div className={`input-with-icon password-field ${formErrors.password ? 'input-error' : passwordValidation.strength === 'strong' ? 'input-success' : passwordValidation.strength === 'good' ? 'input-warning' : ''}`}>
                    {!formErrors.password && password.length === 0 && (
                      <i className="bx bx-lock-alt input-icon-left"></i>
                    )}
                    <input
                      type={passwordVisible ? "text" : "password"}
                      id="register-password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Create a strong password"
                      className={`enhanced-input ${
                        formErrors.password || password.length > 0
                        ? 'no-left-icon' : ''
                      }`}
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${passwordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                    {password.length > 0 && passwordValidation.strength === 'strong' && (
                      <i className="bx bx-check-circle" style={{ 
                        position: 'absolute', 
                        right: '44px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: '#10b981',
                        fontSize: '18px'
                      }}></i>
                    )}
                    {password.length > 0 && passwordValidation.strength !== 'strong' && (
                      <i className="bx bx-info-circle" style={{ 
                        position: 'absolute', 
                        right: '44px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: passwordValidation.strength === 'good' ? '#3b82f6' : passwordValidation.strength === 'fair' ? '#f59e0b' : '#ef4444',
                        fontSize: '18px'
                      }}></i>
                    )}
                  </div>
                  {formErrors.password && <div className="error-message">{formErrors.password}</div>}
                  
                  {password.length > 0 && (
                    <div className="password-strength-container">
                      {/* Strength Meter */}
                      <div className="password-strength-meter">
                        {[1, 2, 3, 4, 5].map((bar) => (
                          <div 
                            key={bar}
                            className={`strength-bar ${
                              bar <= passwordValidation.score ? passwordValidation.strength : ''
                            }`}
                          />
                        ))}
                      </div>
                      
                      {/* Strength Label */}
                      <div className={`password-strength-label strength-${passwordValidation.strength}`}>
                        <i className={`bx ${
                          passwordValidation.strength === 'strong' ? 'bxs-shield-check' :
                          passwordValidation.strength === 'good' ? 'bxs-shield' :
                          passwordValidation.strength === 'fair' ? 'bxs-shield-minus' :
                          'bxs-shield-x'
                        }`}></i>
                        Password strength: {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                      </div>
                      
                      {/* Requirements */}
                      <div className="password-requirements">
                        <div className={`requirement-item ${passwordValidation.hasMinLength ? 'met' : 'unmet'}`}>
                          <i className={`bx ${passwordValidation.hasMinLength ? 'bx-check' : 'bx-x'}`}></i>
                          <span>8+ characters</span>
                        </div>
                        <div className={`requirement-item ${passwordValidation.hasUppercase ? 'met' : 'unmet'}`}>
                          <i className={`bx ${passwordValidation.hasUppercase ? 'bx-check' : 'bx-x'}`}></i>
                          <span>Uppercase (A-Z)</span>
                        </div>
                        <div className={`requirement-item ${passwordValidation.hasLowercase ? 'met' : 'unmet'}`}>
                          <i className={`bx ${passwordValidation.hasLowercase ? 'bx-check' : 'bx-x'}`}></i>
                          <span>Lowercase (a-z)</span>
                        </div>
                        <div className={`requirement-item ${passwordValidation.hasNumber ? 'met' : 'unmet'}`}>
                          <i className={`bx ${passwordValidation.hasNumber ? 'bx-check' : 'bx-x'}`}></i>
                          <span>Number (0-9)</span>
                        </div>
                        <div className={`requirement-item ${passwordValidation.hasSymbol ? 'met' : 'unmet'}`}>
                          <i className={`bx ${passwordValidation.hasSymbol ? 'bx-check' : 'bx-x'}`}></i>
                          <span>Symbol (!@#$)</span>
                        </div>
                      </div>
                      
                      {/* Suggestions */}
                      {passwordValidation.suggestions.length > 0 && (
                        <div className="password-suggestions">
                          <div className="suggestions-title">💡 To strengthen your password:</div>
                          <div className="suggestions-list">
                            {passwordValidation.suggestions.join(' • ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Confirm Password Field */}
                <div className="form-group">
                  <label htmlFor="register-confirm-password">Confirm Password</label>
                  <div className={`input-with-icon password-field ${
                    formErrors.confirmPassword ? 'input-error' : 
                    confirmPassword.length > 0 && password === confirmPassword ? 'input-success' : 
                    confirmPassword.length > 0 && password !== confirmPassword ? 'input-error' : ''
                  }`}>
                    {!formErrors.confirmPassword && confirmPassword.length === 0 && (
                      <i className="bx bx-lock-alt input-icon-left"></i>
                    )}
                    <input
                      type={confirmPasswordVisible ? "text" : "password"}
                      id="register-confirm-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        const newConfirmPassword = e.target.value;
                        setConfirmPassword(newConfirmPassword);
                        // Clear form errors when user starts typing
                        if (formErrors.confirmPassword) {
                          setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                      placeholder="Confirm your password"
                      className={`enhanced-input ${
                        formErrors.confirmPassword || confirmPassword.length > 0
                        ? 'no-left-icon' : ''
                      }`}
                      required
                    />
                    <button 
                      type="button" 
                      className="toggle-password-inline"
                      onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                      tabIndex={-1}
                    >
                      <i className={`bx ${confirmPasswordVisible ? 'bx-hide' : 'bx-show'}`}></i>
                    </button>
                    {confirmPassword.length > 0 && password === confirmPassword && (
                      <i className="bx bx-check-circle" style={{ 
                        position: 'absolute', 
                        right: '44px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: '#10b981',
                        fontSize: '18px'
                      }}></i>
                    )}
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <i className="bx bx-x-circle" style={{ 
                        position: 'absolute', 
                        right: '44px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: '#ef4444',
                        fontSize: '18px'
                      }}></i>
                    )}
                  </div>
                  {formErrors.confirmPassword && <div className="error-message">{formErrors.confirmPassword}</div>}
                  {!formErrors.confirmPassword && confirmPassword.length > 0 && password === confirmPassword && (
                    <div className="success-message" style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                      <i className="bx bx-check-circle"></i> Passwords match
                    </div>
                  )}
                  {!formErrors.confirmPassword && confirmPassword.length > 0 && password !== confirmPassword && (
                    <div className="error-message">
                      Passwords do not match
                    </div>
                  )}
                </div>
                
                {/* Terms and Conditions Checkbox */}
                <div className="form-group terms-container">
                  <input type="checkbox" id="terms" required className="custom-checkbox" />
                  <label htmlFor="terms">
                    I agree to the <a href="/#terms">Terms of Service</a> and{" "}
                    <a href="/#privacy">Privacy Policy</a>
                  </label>
                </div>
                <button 
                  type="submit" 
                  className="btn-primary btn-block register-btn"
                  disabled={loading}
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: "scale(1)"
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {loading ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Creating Account...
                    </>
                  ) : 'Create Account'}
                </button>

                <div className="social-login">
                  <p>Or sign up with</p>
                  <div className="social-buttons">
                    <button 
                      type="button"
                      className="social-btn google"
                      onClick={() => handleSocialLogin('google')}
                      disabled={oauthLoading || loading}
                    >
                      {oauthLoading ? (
                        <>
                          <div className="oauth-spinner"></div>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <GoogleIcon className="social-icon" />
                          <span>Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Already have an account?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setTimeout(() => setShowLoginModal(true), 300);
                  }}
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowForgotPasswordModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowForgotPasswordModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body" ref={forgotPasswordModalRef}>
              <h2 className="modal-title text-center mb-6">Reset Your Password</h2>
              <p className="text-center mb-4">Enter your email address and we'll send you a secure link to reset your password.</p>
              
              {/* Security Notice */}
              <div className="security-notice mb-4" style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <i className="bx bx-info-circle" style={{ color: '#3b82f6' }}></i>
                  <strong style={{ color: '#3b82f6' }}>Security Notice</strong>
                </div>
                <ul style={{ margin: '0', paddingLeft: '16px', color: '#64748b' }}>
                  <li>You can request up to 3 password resets per hour</li>
                  <li>Check your spam folder if you don't see the email</li>
                  <li>The reset link expires after 24 hours</li>
                </ul>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword(e);
              }}>
                <div className="form-group">
                  <label htmlFor="reset-email">Email Address</label>
                  <div className={`input-with-icon ${
                    formErrors.resetEmail ? 'input-error' : 
                    resetEmailValidation.hasBeenChecked && (!resetEmailValidation.isValidFormat || !resetEmailValidation.emailExists) ? 'input-error' : 
                    resetEmailValidation.hasBeenChecked && resetEmailValidation.isValidFormat && resetEmailValidation.emailExists ? 'input-success' : ''
                  }`}>
                    {!formErrors.resetEmail && (
                      <i className="bx bx-envelope input-icon-left"></i>
                    )}
                    <input
                      type="email"
                      id="reset-email"
                      value={resetEmail}
                      onChange={(e) => {
                        const newResetEmail = e.target.value;
                        setResetEmail(newResetEmail);
                        // Clear form errors when user starts typing
                        if (formErrors.resetEmail) {
                          setFormErrors(prev => ({ ...prev, resetEmail: '' }));
                        }
                        // Trigger debounced email validation
                        if (newResetEmail.length > 0) {
                          debouncedResetEmailCheck(newResetEmail);
                        } else {
                          // Reset validation state when email is empty
                          setResetEmailValidation({
                            isValidFormat: false,
                            isChecking: false,
                            emailExists: false,
                            hasBeenChecked: false,
                          });
                        }
                      }}
                      placeholder="Enter your email address"
                      className={`enhanced-input ${formErrors.resetEmail ? 'no-left-icon' : ''}`}
                      required
                      disabled={isResettingPassword}
                      autoComplete="email"
                    />
                  </div>
                  {formErrors.resetEmail && <div className="error-message">{formErrors.resetEmail}</div>}
                  {!formErrors.resetEmail && resetEmailValidation.hasBeenChecked && !resetEmailValidation.isChecking && !resetEmailValidation.isValidFormat && (
                    <div className="error-message">
                      Please enter a valid email address
                    </div>
                  )}
                  {!formErrors.resetEmail && resetEmailValidation.hasBeenChecked && !resetEmailValidation.isChecking && resetEmailValidation.isValidFormat && !resetEmailValidation.emailExists && (
                    <div className="error-message">
                      No account found with this email address. <button 
                        type="button" 
                        className="text-btn" 
                        onClick={() => {
                          setShowForgotPasswordModal(false);
                          setTimeout(() => setShowRegisterModal(true), 300);
                        }}
                        style={{ textDecoration: 'underline', color: 'inherit' }}
                      >
                        Create an account?
                      </button>
                    </div>
                  )}
                  {!formErrors.resetEmail && resetEmailValidation.hasBeenChecked && !resetEmailValidation.isChecking && resetEmailValidation.isValidFormat && resetEmailValidation.emailExists && (
                    <div className="success-message" style={{ color: '#10b981', fontSize: '14px', marginTop: '4px' }}>
                      <i className="bx bx-check-circle"></i> Account found - ready to send reset link
                    </div>
                  )}
                  {!formErrors.resetEmail && resetEmailValidation.isChecking && (
                    <div className="info-message" style={{ color: '#4f72ff', fontSize: '14px', marginTop: '4px' }}>
                      <i className="bx bx-loader-alt bx-spin"></i> Checking account...
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="btn-primary btn-block"
                  disabled={
                    isResettingPassword || 
                    !resetEmail.trim() || 
                    resetEmailValidation.isChecking ||
                    (resetEmailValidation.hasBeenChecked && (!resetEmailValidation.isValidFormat || !resetEmailValidation.emailExists))
                  }
                  style={{ 
                    transition: "all 0.3s ease",
                    transform: isResettingPassword ? "scale(0.98)" : "scale(1)",
                    opacity: isResettingPassword || 
                             !resetEmail.trim() || 
                             resetEmailValidation.isChecking ||
                             (resetEmailValidation.hasBeenChecked && (!resetEmailValidation.isValidFormat || !resetEmailValidation.emailExists)) 
                             ? 0.7 : 1
                  }}
                  onMouseDown={(e) => !isResettingPassword && (e.currentTarget.style.transform = "scale(0.98)")}
                  onMouseUp={(e) => !isResettingPassword && (e.currentTarget.style.transform = "scale(1)")}
                >
                  {isResettingPassword ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i> Sending Secure Link...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-paper-plane"></i> Send Reset Link
                    </>
                  )}
                </button>
                
                {/* Additional help text */}
                <div className="text-center mt-4" style={{ fontSize: '13px', color: '#64748b' }}>
                  <p>
                    <i className="bx bx-shield-check" style={{ color: '#10b981' }}></i>
                    We'll never share your email address with anyone
                  </p>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <p>
                Remember your password?{" "}
                <button
                  className="text-btn"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setTimeout(() => setShowLoginModal(true), 300);
                  }}
                >
                  Back to Login
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Success Modal */}
      {showResetSuccessModal && (
        <div
          className="modal-overlay animate__animated animate__fadeIn"
          onClick={(e) => {
            // Only close if clicking the overlay, not its children
            if (e.target === e.currentTarget) {
              setShowResetSuccessModal(false);
            }
          }}
        >
          <div
            className="modal-container animate__animated animate__fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="logo-container">
                <div className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-wallet text-white"></i>
                  </div>
                  <span className="logo-text">BudgetMe</span>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowResetSuccessModal(false)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
            <div className="modal-body text-center">
              <div className="success-icon mb-4">
                <i className="bx bx-check-circle text-success" style={{ fontSize: '3rem', color: '#10b981' }}></i>
              </div>
              <h2 className="modal-title mb-4">Password Reset Link Sent!</h2>
              <p className="mb-4" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                We've sent a secure password reset link to:<br />
                <strong style={{ color: '#4f72ff' }}>{resetEmail}</strong>
              </p>
              
              {/* Next Steps */}
              <div className="next-steps mb-4" style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'left'
              }}>
                <h4 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                  <i className="bx bx-list-check"></i> Next Steps:
                </h4>
                <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                  <li>Check your email inbox for a message from BudgetMe</li>
                  <li>Click the "Reset My Password" button in the email</li>
                  <li>Create a new secure password on the reset page</li>
                  <li>Sign in with your new password</li>
                </ol>
              </div>
              
              {/* Troubleshooting */}
              <div className="reset-instructions mb-4" style={{
                background: 'rgba(249, 115, 22, 0.05)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '14px'
              }}>
                <h4 style={{ color: '#f97316', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                  <i className="bx bx-help-circle"></i> Didn't receive the email?
                </h4>
                <div style={{ textAlign: 'left', color: '#64748b' }}>
                  <p style={{ margin: '4px 0' }}>
                    <i className="bx bx-search-alt" style={{ color: '#f97316' }}></i> Check your spam/junk folder
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <i className="bx bx-time" style={{ color: '#f97316' }}></i> Wait a few minutes for delivery
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <i className="bx bx-refresh" style={{ color: '#f97316' }}></i> Try requesting another reset link
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '13px', fontStyle: 'italic' }}>
                    The reset link expires in 24 hours for your security
                  </p>
                </div>
              </div>
              
              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setShowResetSuccessModal(false);
                    setResetEmail("");
                    setResetPasswordSuccess(false);
                  }}
                >
                  <i className="bx bx-check"></i> Got It
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowResetSuccessModal(false);
                    setResetPasswordSuccess(false);
                    // Don't clear resetEmail so user can try again
                    setTimeout(() => setShowForgotPasswordModal(true), 200);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    color: '#64748b'
                  }}
                >
                  <i className="bx bx-refresh"></i> Send Another Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerificationModal}
        onClose={() => setShowEmailVerificationModal(false)}
        email={verificationEmail}
        error={error}
      />
    </div>
  );
};

export default LandingPage;
