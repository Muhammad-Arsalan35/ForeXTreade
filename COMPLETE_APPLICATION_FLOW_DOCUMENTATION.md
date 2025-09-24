# Complete Application Flow Documentation

## Executive Summary

**TaskMaster** is a task-based earning platform where users complete video watching tasks to earn money. The platform operates on a VIP membership model with multiple tiers, offering different earning potentials based on subscription levels.

> **⚠️ Important Legal Notice**: This platform contains multi-level referral commission structures that may be considered pyramid schemes in many jurisdictions. Legal consultation is strongly recommended before deployment.

---

## 1. User Registration & Authentication Flow

### Registration Process

#### User Access
- User opens the TaskMaster application

#### Registration Form
User provides the following information:
- **Full Name**
- **Phone Number** (11 digits, used as login ID)
- **Password**
- **Confirm Password**
- **Referral Code** (optional)

#### Account Creation
1. System validates phone number uniqueness
2. Password is encrypted and stored securely
3. Unique referral code is assigned to the user
4. User is assigned "Intern" level by default
5. If referral code is provided, user is linked to referrer's team
6. Referral code helps build referrer's team structure for earning commissions

#### Referral Team Structure
- **Direct signup with User's referral link** = A-Level team member
- **A-Level member's referral** = B-Level team member
- **B-Level member's referral** = C-Level team member

> **Important**: Referrers only earn commissions AFTER their referrals become VIP members. Signup alone does not generate earnings - VIP activation required.

### Login Process
1. User enters phone number and password
2. System authenticates credentials
3. Upon successful login, user accesses the dashboard

---

## 2. Dashboard Overview

The dashboard displays:
- Current VIP level and plan details
- Wallet balances (Personal Wallet & Income Wallet)
- Available daily tasks
- Earnings summary
- Team information
- Quick action buttons

---

## 3. VIP Membership Plans

### Available Plans

| Plan Level | Price (PKR) | Daily Videos | Video Rate | Daily Earning | Validity |
|------------|-------------|--------------|------------|---------------|----------|
| **Intern** | Free | 3 | 10 | 30 | 3 days only |
| **VIP1** | 5,000 | 1 | 150 | 150 | 120 days |
| **VIP2** | 16,000 | 2 | 250 | 500 | 120 days |
| **VIP3** | 36,000 | 3 | 380 | 1,140 | 120 days |
| **VIP4** | 78,000 | 4 | 650 | 2,600 | 120 days |
| **VIP5** | 160,000 | 5 | 1,000 | 5,000 | 120 days |
| **VIP6** | 260,000 | 6 | 1,400 | 8,400 | 120 days |
| **VIP7** | 500,000 | 7 | 2,400 | 16,800 | 120 days |
| **VIP8** | 800,000 | 8 | 3,333 | 26,664 | 120 days |
| **VIP9** | 1,200,000 | 9 | 4,444 | 39,996 | 120 days |
| **VIP10** | 2,400,000 | 10 | 8,000 | 80,000 | 120 days |

### Important Intern Level Restrictions

- **Time Limitation**: Intern users can only watch videos for 3 days after registration
- **Upgrade Requirement**: After 3 days, users must upgrade to VIP to continue earning
- **Withdrawal Limitation**: Intern users cannot withdraw money
- **VIP Requirement**: To withdraw earnings, user must upgrade to any VIP level
- **Earning Capability**: Intern users can earn but cannot cash out until VIP upgrade

### Plan Activation Process

1. **Plan Selection**: User selects desired VIP plan
2. **Balance Check**: System verifies sufficient funds in Personal Wallet
3. **Insufficient Funds**: If balance is low, user is redirected to deposit funds
4. **Plan Purchase**: Amount is deducted from Personal Wallet
5. **Plan Upgrade**: If upgrading, previous plan amount is refunded to Income Wallet
6. **Activation**: New plan becomes active immediately
7. **Task Generation**: Daily tasks are generated based on new plan

---

## 4. Deposit System Flow

### Deposit Process

1. **Deposit Request**: User selects "Deposit Funds"
2. **Payment Method Selection**: Choose from:
   - JazzCash
   - EasyPaisa
3. **Amount Input**: User enters deposit amount
4. **Payment Instructions**: System provides admin payment details
5. **Money Transfer**: User transfers money to admin account
6. **Proof Submission**: User uploads:
   - Transaction screenshot
   - Transaction ID
7. **Status**: Request shows as "Pending"
8. **Admin Approval**: Admin reviews and approves/rejects
9. **Balance Update**: Upon approval, amount is added to Personal Wallet

### Admin Deposit Management

- Admin receives deposit notifications
- Reviews transaction proofs
- Verifies payments with payment providers
- Approves or rejects deposits
- Updates user wallet balances

---

## 5. Task Completion System

### Daily Task Flow

1. **Task Generation**: System automatically generates tasks daily at midnight
2. **Task Access**: User accesses "Task" section
3. **Task Display**: Shows available tasks for the day based on VIP level
4. **Task Execution**:
   - User clicks on task
   - Video player opens with advertisement/promotional content
   - User must watch minimum required duration (typically 10 seconds)
   - Progress bar shows watching progress
5. **Task Completion**: User clicks "Submit & Earn" after watching
6. **Earning Credit**: Task earning is added to Income Wallet
7. **Commission Processing**: Referral commissions are calculated for upline users

### Task Reset Logic

- Tasks reset daily at midnight
- Previous day's incomplete tasks expire
- New tasks generated based on active VIP plan
- Users cannot complete more tasks than their daily limit
- **Intern users are blocked from tasks after 3 days** - must upgrade to VIP to continue

---

## 6. Referral Commission System

### Commission Structure

| Level | Plan Upgrade Commission | Task Earning Commission | Video Commission |
|-------|------------------------|------------------------|------------------|
| **A** | 10% | 3% | 3% |
| **B** | 5% | 1.5% | 1.5% |
| **C** | 2% | 0.75% | 0.75% |

### Commission Processing Flow

1. **Trigger Event**: Team member upgrades to VIP plan (signup alone does not trigger commissions)
2. **VIP Activation Required**: Referrer only earns when referred user becomes VIP member
3. **Upline Identification**: System identifies A, B, C level referrers
4. **Commission Calculation**: Calculate commission based on level and VIP plan purchased
5. **Wallet Credit**: Add commission to referrer's Income Wallet
6. **Transaction Record**: Create commission transaction record
7. **Notification**: Notify referrer of earned commission

### Team Management

Users can view:
- Total team members at each level (A, B, C)
- Individual team member details and VIP status
- Team earnings from commissions (only from VIP members)
- Team member activity status

> **Important**: Admin can monitor complete team structure and member VIP conversions

---

## 7. Withdrawal Process

### Withdrawal Requirements

- **VIP Status Required**: Only VIP members can withdraw funds
- **Intern Restriction**: Intern users cannot withdraw - must upgrade to VIP first
- **Minimum withdrawal**: PKR 30
- **Maximum withdrawal**: PKR 500,000
- **Withdrawal fee**: 2% of amount
- **Source**: Income Wallet only
- **Method**: Same as registered phone number

### Withdrawal Flow

1. **VIP Verification**: System checks if user has active VIP status
2. **Intern Block**: If user is Intern level, withdrawal is blocked with upgrade prompt
3. **Withdrawal Request**: VIP users can select withdrawal amount
4. **Payment Method**: Choose EasyPaisa or JazzCash
5. **Fee Calculation**: System shows 2% fee and net amount
6. **Confirmation**: User confirms withdrawal details
7. **Request Submission**: Request goes to pending status
8. **Admin Processing**: Admin reviews and processes within 24 hours
9. **Payment Transfer**: Admin transfers money to user's account
10. **Status Update**: Admin marks withdrawal as completed

### Withdrawal Validation

- Account details must match registered phone number
- Sufficient balance in Income Wallet
- Withdrawal password verification (additional security)

---

## 8. Financial Management

### Wallet System

#### Personal Wallet
- Receives deposits from external payments
- Used for VIP plan purchases only
- Cannot be withdrawn directly

#### Income Wallet
- Receives task earnings
- Receives referral commissions
- Receives plan refunds (during upgrades)
- Source for withdrawals

### Transaction Types

| Transaction Type | Source | Destination | Purpose |
|------------------|--------|-------------|---------|
| **Deposits** | External payments | Personal Wallet | Add funds to account |
| **Withdrawals** | Income Wallet | User account | Cash out earnings |
| **Plan Purchases** | Personal Wallet | System | Buy VIP plans |
| **Task Earnings** | System | Income Wallet | Daily task rewards |
| **Referral Commissions** | System | Income Wallet | Team member earnings |
| **Plan Refunds** | System | Income Wallet | Upgrade refunds |

---

## 9. Admin Panel Functions

### User Management
- View all registered users
- Monitor user activities
- Update user statuses
- Manage VIP plan assignments
- Handle user support requests

### Transaction Management
- **Deposit Approval**: Review and approve/reject deposit requests
- **Withdrawal Processing**: Process withdrawal requests and transfer money
- **Transaction History**: View all financial transactions
- **Payment Verification**: Verify payments with external providers

### System Monitoring
- Dashboard with key metrics
- User registration trends
- Task completion statistics
- Financial transaction summaries
- Referral commission tracking

### Plan Management
- Create and modify VIP plans
- Set pricing and earning structures
- Manage plan features and benefits
- Monitor plan performance

### Security Features
- Encrypted password storage
- Secure transaction processing
- Admin approval workflows
- User activity monitoring
- Role-based access control

---

## 10. Technical Implementation Notes

### Database Tables
The application uses the following key database tables:
- `users` - User account information
- `membership_plans` - VIP plan details
- `user_plans` - User subscription tracking
- `tasks` - Daily task management
- `task_completions` - Task completion tracking
- `transactions` - Financial transaction records
- `deposits` - Deposit request management
- `withdrawals` - Withdrawal request management
- `referrals` - Referral relationship tracking
- `referral_commissions` - Commission calculation and tracking
- `videos` - Video content management
- `video_earning_rates` - Earning rate configuration
- `app_config` - Application configuration settings

### Security Considerations
- Implement proper authentication and authorization
- Secure payment processing
- Data encryption for sensitive information
- Regular security audits and monitoring

---

## 11. Legal and Compliance Considerations

> **⚠️ Critical Warning**: This platform structure may be subject to regulatory scrutiny in many jurisdictions due to its multi-level marketing characteristics. Before deployment:

1. **Legal Review**: Consult with legal experts familiar with MLM and pyramid scheme regulations
2. **Compliance Check**: Ensure compliance with local financial and business regulations
3. **Licensing**: Obtain necessary business licenses and permits
4. **Terms of Service**: Develop comprehensive terms of service and privacy policies
5. **Risk Assessment**: Conduct thorough risk assessment for regulatory compliance

---

*This documentation is subject to updates and modifications based on additional requirements and regulatory considerations.*