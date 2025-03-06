const getBaseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      /* Main brand colors - Royal Purple & Gold theme */
      --primary: #7C3AED;
      --primary-light: #9F67FF;
      --primary-dark: #5B21B6;
      --secondary: #F59E0B;
      --secondary-light: #FBBF24;
      --accent: #2DD4BF;
      --accent-light: #5EEAD4;
      
      /* Status colors */
      --success: #059669;
      --success-light: #34D399;
      --warning: #F97316;
      --warning-light: #FB923C;
      --danger: #E11D48;
      --danger-light: #FB7185;
      
      /* Neutral colors */
      --gray-50: #F8F9FF;
      --gray-100: #F1F5FF;
      --gray-200: #E2E8FF;
      --gray-300: #CBD5FF;
      --gray-800: #1E1B4B;
      
      /* Gradients */
      --gradient-primary: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      --gradient-secondary: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-light) 100%);
      --gradient-accent: linear-gradient(135deg, var(--accent) 0%, var(--primary-light) 100%);
      --gradient-success: linear-gradient(135deg, var(--success) 0%, var(--success-light) 100%);
      --gradient-warning: linear-gradient(135deg, var(--warning) 0%, var(--warning-light) 100%);
      --gradient-danger: linear-gradient(135deg, var(--danger) 0%, var(--danger-light) 100%);
      
      /* Special gradients */
      --gradient-royal: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      --gradient-premium: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-light) 60%, #FEF3C7 100%);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }

    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: var(--gray-800);
      margin: 0;
      padding: 0;
      background-color: var(--gray-50);
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      animation: fadeIn 0.5s ease-out;
    }

    .header {
      background: var(--gradient-royal);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-radius: 16px 16px 0 0;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(124, 58, 237, 0.15);
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
      background-size: 20px 20px;
      animation: patternMove 20s linear infinite;
    }

    .header::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer 2s infinite;
    }

    .content {
      background: white;
      padding: 40px;
      border-radius: 0 0 16px 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    .button {
      display: inline-block;
      padding: 12px 24px;
      background: var(--gradient-royal);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 20px 0;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(124, 58, 237, 0.2);
      position: relative;
      overflow: hidden;
    }

    .button::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        rgba(255,255,255,0.2),
        rgba(255,255,255,0.2)
      );
      transform: rotate(45deg);
      transition: all 0.3s ease;
      opacity: 0;
    }

    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(124, 58, 237, 0.3);
    }

    .button:hover::after {
      opacity: 1;
      transform: rotate(45deg) translate(50%, 50%);
    }

    .info-box {
      background: linear-gradient(135deg, var(--gray-50) 0%, white 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid var(--gray-200);
      transition: all 0.3s ease;
      animation: fadeIn 0.5s ease-out;
    }

    .info-box:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
      border-color: var(--primary-light);
    }

    .icon {
      font-size: 48px;
      margin-bottom: 20px;
      animation: float 3s ease-in-out infinite;
    }

    .badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
      margin: 4px;
      animation: slideIn 0.5s ease-out;
    }

    .badge-success {
      background: var(--gradient-success);
      color: white;
      box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
    }

    .badge-warning {
      background: var(--gradient-warning);
      color: white;
      box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
    }

    .badge-danger {
      background: var(--gradient-danger);
      color: white;
      box-shadow: 0 2px 4px rgba(225, 29, 72, 0.2);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 20px;
      margin: 20px 0;
      animation: fadeIn 0.5s ease-out;
    }

    .stat-item {
      background: linear-gradient(135deg, white, var(--gray-50));
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(124, 58, 237, 0.05);
      transition: all 0.3s ease;
      border: 1px solid var(--gray-200);
    }

    .stat-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
      border-color: var(--primary-light);
      background: var(--gradient-premium);
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      background: var(--gradient-royal);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .stat-label {
      font-size: 14px;
      color: var(--gray-800);
      font-weight: 500;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--gray-100);
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--gradient-royal);
      transition: width 1s ease-in-out;
      animation: shimmer 2s infinite;
    }

    .notification {
      position: relative;
      padding: 15px;
      background: linear-gradient(135deg, white, var(--gray-50));
      border-radius: 8px;
      margin: 10px 0;
      border-left: 4px solid var(--primary);
      animation: slideIn 0.5s ease-out;
      box-shadow: 0 2px 4px rgba(124, 58, 237, 0.05);
    }

    @media (max-width: 600px) {
      .container { padding: 10px; }
      .content { padding: 20px; }
      .header { padding: 30px 20px; }
      .stats {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .stat-item {
        padding: 15px;
      }
      .button {
        width: 100%;
        padding: 15px 20px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }

    /* Update Twitter button color */
    .button[href*="twitter"] {
      background: linear-gradient(135deg, #1DA1F2 0%, #19C3FF 100%);
      box-shadow: 0 4px 6px rgba(29, 161, 242, 0.2);
    }

    .button[href*="twitter"]:hover {
      box-shadow: 0 6px 12px rgba(29, 161, 242, 0.3);
    }

    /* Premium Elements */
    .premium-badge {
      background: var(--gradient-premium);
      color: var(--gray-800);
      box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
    }

    /* Footer Links */
    a {
      color: var(--primary);
      text-decoration: none;
      transition: all 0.3s ease;
    }

    a:hover {
      color: var(--primary-light);
      text-decoration: underline;
    }

    /* Header Title Enhancement */
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
      letter-spacing: -0.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Document Scanner. All rights reserved.</p>
      <p style="font-size: 12px; color: #6B7280;">
        This email was sent to you because you have an account with Document Scanner.
        If you didn't request this email, please ignore it or <a href="${
          process.env.CLIENT_URL
        }/contact" style="color: var(--primary);">contact support</a>.
      </p>
    </div>
  </div>
</body>
</html>
`;

const templates = {
  verifyEmail: (username, verificationUrl) => {
    const content = `
      <div class="header">
        <div class="icon">🚀</div>
        <h1>Welcome to Document Scanner!</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <p>Welcome aboard! We're excited to have you join us. To get started, please verify your email address by clicking the button below:</p>
        <center>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </center>
        <div class="info-box">
          <p>⏰ This link will expire in 24 hours.</p>
          <p>🔒 If you did not create an account, you can safely ignore this email.</p>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6B7280; font-size: 14px;">${verificationUrl}</p>
      </div>
    `;
    return getBaseTemplate(content);
  },

  resetPassword: (username, resetUrl) => {
    const content = `
      <div class="header">
        <div class="icon">🔐</div>
        <h1>Password Reset Request</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <p>We received a request to reset your password. If you made this request, click the button below to choose a new password:</p>
        <center>
          <a href="${resetUrl}" class="button">Reset Password</a>
        </center>
        <div class="info-box">
          <p>⚠️ This link will expire in 1 hour.</p>
          <p>🔒 If you didn't request a password reset, please ignore this email.</p>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6B7280; font-size: 14px;">${resetUrl}</p>
      </div>
    `;
    return getBaseTemplate(content);
  },

  newLogin: (username, deviceInfo) => {
    const content = `
      <div class="header">
        <div class="icon">🔔</div>
        <h1>New Login Detected</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <p>We detected a new login to your account from:</p>
        <div class="info-box">
          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">📱</div>
              <div class="stat-label">${deviceInfo.deviceName}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">📍</div>
              <div class="stat-label">${deviceInfo.location}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">⏰</div>
              <div class="stat-label">${deviceInfo.time}</div>
            </div>
          </div>
        </div>
        <p>If this wasn't you, please take immediate action:</p>
        <center>
          <a href="${process.env.CLIENT_URL}/settings/security" class="button">Review Security Settings</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },

  twoFactorEnabled: (username) => {
    const content = `
      <div class="header">
        <div class="icon">🛡️</div>
        <h1>Two-Factor Authentication Enabled</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <div class="badge badge-success">Security Update</div>
        <p>Two-factor authentication has been successfully enabled on your account. Your account is now more secure!</p>
        <div class="info-box">
          <p>🔐 Keep your backup codes in a safe place</p>
          <p>📱 You'll need them if you lose access to your authentication app</p>
        </div>
        <p>If you didn't enable two-factor authentication, please contact our support team immediately.</p>
        <center>
          <a href="${process.env.CLIENT_URL}/support" class="button">Contact Support</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },

  lowCredits: (username, credits) => {
    const content = `
      <div class="header">
        <div class="icon">⚠️</div>
        <h1>Low Credits Alert</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <div class="badge badge-warning">Credit Alert</div>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${credits}</div>
            <div class="stat-label">Credits Remaining</div>
          </div>
        </div>
        <p>Your Document Scanner account is running low on credits. To ensure uninterrupted service, please purchase additional credits.</p>
        <center>
          <a href="${process.env.CLIENT_URL}/credits/purchase" class="button">Purchase Credits</a>
        </center>
        <div class="info-box">
          <p>💡 Tip: Consider upgrading to a premium plan for better credit rates!</p>
        </div>
      </div>
    `;
    return getBaseTemplate(content);
  },

  documentScanComplete: (username, scanResults) => {
    const content = `
      <div class="header">
        <div class="icon">📄</div>
        <h1>Scan Complete</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <div class="badge badge-success">Scan Complete</div>
        <p>Your document scan has been completed successfully!</p>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${scanResults.similarity}%</div>
            <div class="stat-label">Similarity Score</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${scanResults.matches}</div>
            <div class="stat-label">Matches Found</div>
          </div>
        </div>
        <center>
          <a href="${process.env.CLIENT_URL}/documents/${scanResults.documentId}" class="button">View Results</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },

  weeklyReport: (username, stats) => {
    const content = `
      <div class="header">
        <div class="icon">📊</div>
        <h1>Your Weekly Activity Report</h1>
      </div>
      <div class="content">
        <h2>Hello ${username},</h2>
        <p>Here's your document scanning activity for the past week:</p>
        
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${stats.scannedDocs}</div>
            <div class="stat-label">Documents Scanned</div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${
                (stats.scannedDocs / stats.maxDocs) * 100
              }%"></div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.avgSimilarity}%</div>
            <div class="stat-label">Avg. Similarity</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.creditsUsed}</div>
            <div class="stat-label">Credits Used</div>
          </div>
        </div>

        <div class="notification">
          <strong>🎯 Goal Progress:</strong> You're ${
            stats.goalProgress
          }% towards your monthly scanning goal!
        </div>

        <div class="info-box">
          <h3>📈 Trending Topics in Your Documents</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${stats.topics
              .map(
                (topic) => `
              <span class="badge badge-success">${topic}</span>
            `
              )
              .join("")}
          </div>
        </div>

        <center>
          <a href="${
            process.env.CLIENT_URL
          }/dashboard" class="button">View Full Report</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },

  achievementUnlocked: (username, achievement) => {
    const content = `
      <div class="header">
        <div class="icon">🏆</div>
        <h1>Achievement Unlocked!</h1>
      </div>
      <div class="content">
        <h2>Congratulations ${username}!</h2>
        <div class="badge badge-success">New Achievement</div>
        
        <div class="info-box" style="text-align: center;">
          <div style="font-size: 64px; margin: 20px 0;">${achievement.icon}</div>
          <h3>${achievement.title}</h3>
          <p>${achievement.description}</p>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">+${achievement.bonusCredits}</div>
              <div class="stat-label">Bonus Credits</div>
            </div>
          </div>
        </div>

        <div class="notification">
          <strong>🎉 Share your achievement:</strong>
          <div style="margin-top: 10px;">
            <a href="https://twitter.com/intent/tweet?text=I just earned the ${achievement.title} badge on Document Scanner!" 
               class="button" style="background: #1DA1F2;">Share on Twitter</a>
          </div>
        </div>

        <center>
          <a href="${process.env.CLIENT_URL}/achievements" class="button">View All Achievements</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },

  subscriptionUpgrade: (username, plan) => {
    const content = `
      <div class="header">
        <div class="icon">⭐</div>
        <h1>Welcome to ${plan.name}!</h1>
      </div>
      <div class="content">
        <h2>Thank you, ${username}!</h2>
        <div class="badge badge-success">Plan Upgraded</div>
        
        <div class="info-box">
          <h3>Your New Benefits:</h3>
          <ul style="list-style-type: none; padding: 0;">
            ${plan.benefits
              .map(
                (benefit) => `
              <li style="margin: 10px 0;">
                <span style="color: var(--success);">✓</span> ${benefit}
              </li>
            `
              )
              .join("")}
          </ul>
        </div>

        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${plan.credits}</div>
            <div class="stat-label">Monthly Credits</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${plan.storage}GB</div>
            <div class="stat-label">Storage</div>
          </div>
        </div>

        <center>
          <a href="${
            process.env.CLIENT_URL
          }/dashboard" class="button">Explore New Features</a>
        </center>
      </div>
    `;
    return getBaseTemplate(content);
  },
};

module.exports = templates;
