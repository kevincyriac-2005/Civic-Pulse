import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState({
    totalComplaints: 0,
    resolvedTodayPercent: 0,
    avgResponseHours: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    topic: '',
    message: ''
  });
  const [contactLoading, setContactLoading] = useState(false);

  const [faqOpen, setFaqOpen] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const aboutRef = useRef(null);
  const faqRef = useRef(null);
  const contactRef = useRef(null);

  // Fetch real stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/public-stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.warn('[Home] Could not load stats');
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setNavScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll function
  const scrollToSection = (ref) => {
    if (ref?.current) {
      window.scrollTo({
        top: ref.current.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  };

  // Handle contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/contact-message', contactForm);
      toast.success(`Message sent! We'll get back to you at ${contactForm.email} soon.`);
      setContactForm({ name: '', email: '', topic: '', message: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(msg);
    } finally {
      setContactLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Toggle FAQ item
  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  // Incident dot click handler
  const handleIncidentClick = (type) => {
    console.log(`Incident clicked: ${type}`);
    const event = new CustomEvent('incidentClick', { detail: { type } });
    window.dispatchEvent(event);
  };

  const features = [
    {
      icon: 'fas fa-layer-group',
      title: 'MERN Stack Platform',
      description: 'Built on MongoDB, Express.js, React.js, and Node.js — a structured digital platform for reporting, tracking, and resolving civic issues.',
      stat: 'MERN',
      statLabel: 'Stack'
    },
    {
      icon: 'fas fa-eye',
      title: 'Google Vision API',
      description: 'Citizen-uploaded images are analyzed using Google Cloud Vision API to assist in identifying the type of issue, reducing manual categorization effort.',
      stat: 'Vision',
      statLabel: 'API'
    },
    {
      icon: 'fas fa-map-marked-alt',
      title: 'Location-Based Tracking',
      description: 'Geolocation captures accurate coordinates at complaint submission, enabling issue visualization on maps and better tracking for field teams.',
      stat: 'GPS',
      statLabel: 'Enabled'
    },
    {
      icon: 'fas fa-users-cog',
      title: 'Role-Based Workflow',
      description: 'Citizens, Officers, Field Workers, and Administrators each have a defined role ensuring smooth coordination and effective communication.',
      stat: '4 Roles',
      statLabel: 'Workflow'
    },
    {
      icon: 'fas fa-check-double',
      title: 'Before & After Verification',
      description: 'Field workers upload completion photos upon task closure. Officers verify before and after images to confirm resolution and prevent false closures.',
      stat: 'Photo',
      statLabel: 'Verified'
    },
    {
      icon: 'fas fa-chart-bar',
      title: 'Analytics & Dashboards',
      description: 'Dashboards provide authorities with complaint status monitoring and visualization of frequently occurring problem areas for data-driven decisions.',
      stat: 'Live',
      statLabel: 'Analytics'
    }
  ];

  const faqItems = [
    {
      question: 'What is Civic-Pulse?',
      answer: 'Civic-Pulse is a web-based civic complaint management system built using the MERN Stack. It provides a structured digital platform that improves the process of reporting, tracking, and resolving civic issues such as infrastructure damage, sanitation problems, waste management, and public safety concerns.'
    },
    {
      question: 'How does image-based issue identification work?',
      answer: 'When citizens submit a complaint with a photo, the image is analyzed using the Google Cloud Vision API. The API identifies labels and categories associated with the image, helping to determine the type of issue reported. This reduces manual effort in categorizing complaints and improves routing efficiency.'
    },
    {
      question: 'How is location data used in Civic-Pulse?',
      answer: 'Geolocation features capture accurate coordinates when a citizen submits a complaint. These coordinates are stored with the complaint record and displayed on maps in officer and admin dashboards, enabling better tracking, visualization, and identification of problem areas.'
    },
    {
      question: 'How is complaint resolution verified?',
      answer: 'Civic-Pulse uses a before and after image verification mechanism. Field workers upload completion photos when closing a complaint. Officers then review both the original complaint image and the completion photo before officially marking the issue as resolved, improving accountability and reducing false closures.'
    },
    {
      question: 'Who are the users of the system?',
      answer: 'The system supports four roles: Citizens who submit and track complaints; Officers who review, assign, and manage complaints; Field Workers who execute assigned tasks and upload completion evidence; and Administrators who manage users, departments, and monitor system-wide analytics.'
    }
  ];

  const marqueeItems = [
    '🌐 MERN Stack',
    '📷 Google Vision API',
    '📍 Location Tracking',
    '✅ Before & After Verification',
    '👥 4-Role Workflow',
    '📊 Analytics Dashboard',
    '🔐 JWT Authentication',
    '🗺 Complaint Mapping'
  ];

  return (
    <div className="home-page">
      {/* Top info moved to footer - hidden here */}

      {/* Navigation Bar */}
      <nav className={`navbar navbar-expand-lg navbar-dark ${navScrolled ? 'scrolled' : ''}`}>
        <div className="container-fluid">
          <a className="navbar-brand" href="/">
            <i className="fas fa-building-columns mr-2"></i>
            Civic-Pulse
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <div className="navbar-nav ms-auto align-items-center">
              <a className="nav-link active" href="/">
                Home
              </a>
              <button
                className="nav-link btn btn-link"
                onClick={() => scrollToSection(featuresRef)}
              >
                Features
              </button>
              <button
                className="nav-link btn btn-link"
                onClick={() => scrollToSection(aboutRef)}
              >
                About
              </button>
              <button
                className="nav-link btn btn-link"
                onClick={() => scrollToSection(faqRef)}
              >
                FAQ
              </button>
              <button
                className="nav-link btn btn-link"
                onClick={() => scrollToSection(contactRef)}
              >
                Contact
              </button>
              <a href="/login" className="nav-link ml-3">
                <i className="fas fa-user mr-1"></i> Login
              </a>
              <a href="/register" className="btn btn-primary btn-sm ml-3">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="hero-content">
                <span className="hero-tag">MERN Stack Civic Complaint Management System</span>
                <h1 className="hero-title">
                  Report. Track. Resolve. <span className="text-primary">Together.</span>
                </h1>
                <p className="hero-subtitle">
                  Civic-Pulse is a digital platform that improves the reporting, tracking, and resolution
                  of civic issues — from infrastructure damage and sanitation problems to waste management
                  and public safety concerns.
                </p>
                <div className="hero-buttons">
                  <a href="/register" className="btn btn-primary btn-lg mr-3">
                    Get Started Free
                  </a>
                  <button
                    className="btn btn-outline-light btn-lg scroll-link"
                    onClick={() => scrollToSection(featuresRef)}
                  >
                    Learn More
                  </button>
                </div>

                {/* Hero Stats */}
                <div className="hero-stats mt-5">
                  <div className="row">
                    <div className="col-4">
                      <div className="stat-item">
                        <div className="stat-number">{statsLoading ? "..." : stats.totalComplaints}</div>
                        <div className="stat-label">Total Complaints</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="stat-item">
                        <div className="stat-number">{statsLoading ? "..." : `${stats.resolvedTodayPercent}%`}</div>
                        <div className="stat-label">Resolved Today</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="stat-item">
                        <div className="stat-number">{statsLoading ? "..." : (stats.avgResponseHours === 0 ? "N/A" : `${stats.avgResponseHours}h`)}</div>
                        <div className="stat-label">Avg Response Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              {/* Civic Intelligence Visualization */}
              <div className="civic-visualization">
                {/* Animated City Map */}
                <div className="city-map-container">
                  <div className="city-map">
                    {/* City Skyline */}
                    <div className="city-skyline">
                      {[80, 120, 100, 140, 90, 110].map((height, index) => (
                        <div
                          key={index}
                          className="building"
                          style={{ height: `${height}px` }}
                        ></div>
                      ))}
                    </div>

                    {/* Interactive Dots (Incidents) */}
                    <div className="incident-dots">
                      <div
                        className="incident-dot incident-pos-1"
                        data-type="infrastructure"
                        onClick={() => handleIncidentClick('infrastructure')}
                      ></div>
                      <div
                        className="incident-dot incident-pos-2"
                        data-type="safety"
                        onClick={() => handleIncidentClick('safety')}
                      ></div>
                      <div
                        className="incident-dot active incident-pos-3"
                        data-type="environmental"
                        onClick={() => handleIncidentClick('environmental')}
                      ></div>
                      <div
                        className="incident-dot incident-pos-4"
                        data-type="infrastructure"
                        onClick={() => handleIncidentClick('infrastructure')}
                      ></div>
                      <div
                        className="incident-dot critical incident-pos-5"
                        data-type="safety"
                        onClick={() => handleIncidentClick('safety')}
                      ></div>
                      <div
                        className="incident-dot incident-pos-6"
                        data-type="environmental"
                        onClick={() => handleIncidentClick('environmental')}
                      ></div>
                    </div>

                    {/* Heat Map Overlay */}
                    <div className="heat-map"></div>

                    {/* Floating Data Points */}
                    <div className="data-points">
                      <div className="data-point data-point-pos-1">
                        <i className="fas fa-traffic-light"></i>
                      </div>
                      <div className="data-point data-point-pos-2">
                        <i className="fas fa-trash"></i>
                      </div>
                      <div className="data-point data-point-pos-3">
                        <i className="fas fa-road"></i>
                      </div>
                      <div className="data-point data-point-pos-4">
                        <i className="fas fa-lightbulb"></i>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="map-legend">
                    <div className="legend-item">
                      <span className="legend-dot normal"></span>
                      <span>Infrastructure</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot active"></span>
                      <span>Environmental</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot critical"></span>
                      <span>Safety</span>
                    </div>
                  </div>
                </div>

                {/* System Status Container */}
                <div style={{ height: '35%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
                  <div className="home-live-badge">
                    <span className="home-live-dot" />
                    System Operational
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Strip */}
      <div className="marquee-container">
        <div className="marquee-content">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={index} className="marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <section ref={featuresRef} className="features-section py-5">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12">
              <h2 className="section-title">Key Features</h2>
              <p className="section-subtitle">Built on the MERN Stack with Google Cloud Vision API integration</p>
            </div>
          </div>
          <div className="row">
            {features.map((feature, index) => (
              <div key={index} className="col-md-6 col-lg-4 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className={feature.icon}></i>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-stat">
                    <span className="stat-number">{feature.stat}</span>
                    <span className="stat-label">{feature.statLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutRef} className="about-section py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-5 mb-lg-0">
              <h2 className="section-title">About Civic-Pulse</h2>
              <p className="about-text">
                Civic-Pulse is a web-based civic complaint management system developed using the MERN Stack.
                It addresses the challenges of traditional manual systems — delays, lack of transparency,
                and inefficient complaint handling — by providing a structured digital platform for civic
                issue management in urban and semi-urban areas.
              </p>
              <p className="about-text">
                Citizens submit complaints with images and location details. The system uses Google Cloud
                Vision API to assist in identifying the type of issue, reducing manual categorization effort
                and improving routing efficiency to the appropriate departments.
              </p>
              <p className="about-text">
                The platform supports a role-based workflow involving citizens, officers, field workers,
                and administrators, ensuring smooth coordination. Dashboards provide authorities with
                analytics and visualization to monitor complaint status and identify recurring problem areas.
              </p>
            </div>
            <div className="col-lg-6">
              <div className="about-visual">
                <div className="about-card">
                  <div className="about-card-header">
                    <i className="fas fa-city"></i>
                    <h4>Built for Modern Governance</h4>
                  </div>
                  <div className="about-card-body about-card-body--single">
                    <p className="about-card-verify-text">
                      Verification at Closure — Field workers upload a completion photo when resolving a task.
                      Officers review the before and after images side-by-side before officially marking
                      the complaint as resolved, improving accountability and reducing false closures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} className="faq-section py-5">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12 text-center">
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">Get answers about Civic-Pulse platform</p>
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="accordion" id="faqAccordion">
                {faqItems.map((item, index) => (
                  <div key={index} className="card">
                    <div className="card-header" id={`heading${index}`}>
                      <h5 className="mb-0">
                        <button
                          className={`btn btn-link ${faqOpen === index ? '' : 'collapsed'}`}
                          type="button"
                          onClick={() => toggleFaq(index)}
                        >
                          {item.question}
                        </button>
                      </h5>
                    </div>
                    <div
                      id={`collapse${index}`}
                      className={`collapse ${faqOpen === index ? 'show' : ''}`}
                      aria-labelledby={`heading${index}`}
                    >
                      <div className="card-body">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactRef} className="contact-section py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-5 mb-5 mb-lg-0">
              <h2 className="section-title text-white mb-4">Get in Touch</h2>
              <p className="text-light mb-4">
                Ready to modernize your civic governance? Contact our team to schedule a personalized demo or
                discuss your specific requirements.
              </p>
              <div className="contact-info">
                
                
                <div className="contact-item mb-4">
                  <i className="fas fa-envelope mr-3"></i>
                  <a href="mailto:civicpulse26@gmail.com" style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    civicpulse26@gmail.com
                  </a>
                </div>
                <div className="contact-item mb-4">
                  <i className="fas fa-clock mr-3"></i>
                  <span>Monday - Friday: 9:00 AM - 6:00 PM IST</span>
                </div>
              </div>
              
            </div>
            <div className="col-lg-7">
              <div className="glass-card contact-form">
                <h4 className="mb-4">Send us a Message</h4>
                <form onSubmit={handleContactSubmit}>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        placeholder="Your Name"
                        value={contactForm.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group col-md-6">
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        placeholder="Email Address"
                        value={contactForm.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <select
                      className="form-control"
                      name="topic"
                      value={contactForm.topic}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Topic</option>
                      <option value="demo">Request Demo</option>
                      <option value="support">Technical Support</option>
                      <option value="partnership">Partnership Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <textarea
                      className="form-control"
                      name="message"
                      rows="4"
                      placeholder="Your Message"
                      value={contactForm.message}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={contactLoading}>
                    {contactLoading
                      ? <><i className="fas fa-spinner fa-spin me-2"></i>Sending...</>
                      : <><i className="fas fa-paper-plane me-2"></i>Send Message</>
                    }
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer py-4">
        <div className="container">
          {/* Footer top: moved contact/info from top bar */}
          <div className="row mb-3 footer-top align-items-center">
            <div className="col-md-6">
              <span className="info-item d-block d-md-inline">
                <i className="far fa-clock me-2"></i> Mon-Fri: 9:00 AM - 6:00 PM IST
              </span>
            </div>
            <div className="col-md-6 text-md-right">
              <span className="info-item">
                <i className="fas fa-envelope me-2"></i>
                <a href="mailto:civicpulse26@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>
                  civicpulse26@gmail.com
                </a>
              </span>
            </div>
          </div>

          <div className="row align-items-center">
            <div className="col-md-6 mb-3 mb-md-0">
              <div className="footer-logo">
                <i className="fas fa-building-columns me-2"></i>Civic-Pulse
              </div>
              <p className="text-muted small mb-0 mt-2">Civic Issue Reporting &amp; Resolution Platform</p>
            </div>
            <div className="col-md-6 text-md-right">
              <div className="footer-links">
                <button
                  className="footer-link scroll-link"
                  onClick={() => scrollToSection(featuresRef)}
                >
                  Features
                </button>
                <button
                  className="footer-link scroll-link ms-3"
                  onClick={() => scrollToSection(aboutRef)}
                >
                  About
                </button>
                <button
                  className="footer-link scroll-link ms-3"
                  onClick={() => scrollToSection(faqRef)}
                >
                  FAQ
                </button>
                <button
                  className="footer-link scroll-link ms-3"
                  onClick={() => scrollToSection(contactRef)}
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
          <hr className="my-3" />
          <div className="row align-items-center">
            <div className="col-md-6">
              <p className="text-muted small mb-0">&copy; {new Date().getFullYear()} Civic-Pulse. All rights reserved.</p>
            </div>
            <div className="col-md-6 text-md-right">
              <p className="text-muted small mb-0">Built with MERN Stack &amp; Google Cloud Vision API</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
