# TaskMaster Referral System - Business Logic Flow

## 🎯 **Level System Overview**

### **Three-Tier Referral Structure:**
- **A-Level**: Top-level referrers (can refer B and C levels)
- **B-Level**: Mid-level members (can refer C levels only)
- **C-Level**: End users (cannot refer others)

---

## 📊 **Business Logic Flow Examples**

### **Example 1: A-Level User Journey**

#### **User: Ahmed (A-Level Leader)**
```
Ahmed signs up → Becomes A-Level (no referral used)
├── Referral Code: AHMED123
├── Can refer: B-Level and C-Level users
├── Commission: Rs. 50 per B-Level, Rs. 25 per C-Level
└── Team Bonus: 10% from B-Level video earnings
```

#### **Ahmed's Earning Flow:**
1. **Direct Referrals:**
   - Refers Sara (B-Level) → Gets Rs. 50 commission
   - Refers Ali (C-Level) → Gets Rs. 25 commission

2. **Team Bonuses:**
   - Sara watches 10 videos (Rs. 200 earnings)
   - Ahmed gets 10% = Rs. 20 team bonus

3. **Total Earnings:**
   - Referral Commissions: Rs. 75
   - Team Bonuses: Rs. 20
   - **Total: Rs. 95**

---

### **Example 2: B-Level User Journey**

#### **User: Sara (B-Level Member)**
```
Sara signs up with Ahmed's code → Becomes B-Level
├── Referral Code: SARA456
├── Can refer: C-Level users only
├── Commission: Rs. 25 per C-Level
└── Team Bonus: 5% from C-Level video earnings
```

#### **Sara's Earning Flow:**
1. **Video Watching:**
   - Watches 10 videos → Earns Rs. 200
   - Ahmed gets 10% bonus = Rs. 20

2. **Referrals:**
   - Refers Fatima (C-Level) → Gets Rs. 25 commission
   - Refers Omar (C-Level) → Gets Rs. 25 commission

3. **Team Bonuses:**
   - Fatima watches 5 videos (Rs. 100 earnings)
   - Sara gets 5% = Rs. 5 team bonus

4. **Total Earnings:**
   - Video Earnings: Rs. 200
   - Referral Commissions: Rs. 50
   - Team Bonuses: Rs. 5
   - **Total: Rs. 255**

---

### **Example 3: C-Level User Journey**

#### **User: Fatima (C-Level User)**
```
Fatima signs up with Sara's code → Becomes C-Level
├── Referral Code: FATIMA789
├── Can refer: No one (end user)
├── Commission: None
└── Team Bonus: None
```

#### **Fatima's Earning Flow:**
1. **Video Watching:**
   - Watches 5 videos → Earns Rs. 100
   - Sara gets 5% bonus = Rs. 5

2. **Total Earnings:**
   - Video Earnings: Rs. 100
   - **Total: Rs. 100**

---

## 💰 **Commission Structure**

### **A-Level Commissions:**
- **B-Level Referral**: Rs. 50 (direct commission)
- **C-Level Referral**: Rs. 25 (direct commission)
- **B-Level Team Bonus**: 10% of their video earnings
- **C-Level Team Bonus**: 5% of their video earnings (through B-Level)

### **B-Level Commissions:**
- **C-Level Referral**: Rs. 25 (direct commission)
- **C-Level Team Bonus**: 5% of their video earnings

### **C-Level Commissions:**
- **No referral commissions** (end users)
- **No team bonuses** (cannot build team)

---

## 🎬 **Video Watching System**

### **Daily Limits by Membership:**
- **Free Trial**: 5 videos/day for 3 days
- **VIP Basic**: 20 videos/day
- **VIP Premium**: 50 videos/day
- **VIP Ultimate**: 100 videos/day

### **Video Earnings:**
- **Short Video (30s)**: Rs. 10
- **Medium Video (60s)**: Rs. 20
- **Long Video (90s)**: Rs. 30

---

## 🔄 **Complete Flow Example**

### **Scenario: Multi-Level Team Building**

```
Ahmed (A-Level) - Referral Code: AHMED123
├── Refers Sara (B-Level) → Ahmed gets Rs. 50
│   ├── Sara refers Fatima (C-Level) → Sara gets Rs. 25, Ahmed gets Rs. 25
│   └── Sara refers Omar (C-Level) → Sara gets Rs. 25, Ahmed gets Rs. 25
├── Refers Ali (B-Level) → Ahmed gets Rs. 50
│   └── Ali refers Zara (C-Level) → Ali gets Rs. 25, Ahmed gets Rs. 25
└── Refers Maria (C-Level) → Ahmed gets Rs. 25

Team Structure:
Ahmed (A-Level)
├── Sara (B-Level)
│   ├── Fatima (C-Level)
│   └── Omar (C-Level)
├── Ali (B-Level)
│   └── Zara (C-Level)
└── Maria (C-Level)

Earnings Summary:
Ahmed: Rs. 50 + Rs. 50 + Rs. 25 + Rs. 25 + Rs. 25 + Rs. 25 = Rs. 200
Sara: Rs. 25 + Rs. 25 = Rs. 50
Ali: Rs. 25
```

---

## 📱 **Frontend Implementation Flow**

### **1. Signup Process:**
```
User visits: /signup?ref=AHMED123
├── System detects referral code
├── Validates code exists
├── Determines user level:
│   ├── Valid A-Level code → User becomes B-Level
│   ├── Valid B-Level code → User becomes C-Level
│   └── Invalid/No code → User becomes A-Level
└── Creates user profile with appropriate level
```

### **2. Dashboard Display:**
```
A-Level Dashboard:
├── Can refer B and C levels
├── Shows team statistics
├── Displays referral commissions
└── Shows team bonuses

B-Level Dashboard:
├── Can refer C levels only
├── Shows limited team stats
├── Displays referral commissions
└── Shows team bonuses

C-Level Dashboard:
├── Cannot refer others
├── Shows video watching stats
├── No referral features
└── No team building
```

### **3. Video Watching Flow:**
```
User clicks "Watch Video"
├── Check daily limit
├── If limit reached:
│   ├── Free user → Show upgrade modal
│   └── VIP user → Show "come back tomorrow"
├── If can watch:
│   ├── Process video watch
│   ├── Update earnings
│   ├── Update team leader bonuses
│   └── Show success message
```

---

## 🎯 **Key Business Rules**

### **Level Assignment Rules:**
1. **A-Level**: Direct signup (no referral) or invalid referral code
2. **B-Level**: Referred by A-Level user
3. **C-Level**: Referred by B-Level user

### **Referral Rules:**
1. **A-Level**: Can refer unlimited B and C levels
2. **B-Level**: Can refer up to 10 C levels
3. **C-Level**: Cannot refer anyone

### **Commission Rules:**
1. **Direct Commission**: Paid immediately on signup
2. **Team Bonus**: Calculated daily from video earnings
3. **Multi-Level**: A-Level gets commission from B-Level's referrals

### **Video Limit Rules:**
1. **Trial**: 5 videos/day for 3 days
2. **Free**: 0 videos after trial
3. **VIP**: Based on plan (20/50/100 videos/day)

---

## 🔧 **Database Schema Requirements**

### **User Profiles Table:**
```sql
- user_id (UUID)
- full_name (VARCHAR)
- username (VARCHAR)
- membership_level (ENUM: 'a_level', 'b_level', 'c_level')
- membership_type (ENUM: 'free', 'vip')
- referral_code (VARCHAR) - Unique 6-digit code
- referred_by (UUID) - Who referred this user
- upline_id (UUID) - Direct upline (referrer)
- team_leader_id (UUID) - Team leader for bonuses
- can_refer (BOOLEAN) - Whether user can refer others
- max_referrals (INTEGER) - Maximum referrals allowed
```

### **Referral Commissions Table:**
```sql
- referrer_id (UUID)
- referred_user_id (UUID)
- commission_amount (DECIMAL)
- commission_type (ENUM: 'direct', 'team_bonus')
- level_type (ENUM: 'b_level', 'c_level')
- status (ENUM: 'pending', 'paid')
```

### **Team Bonuses Table:**
```sql
- team_leader_id (UUID)
- team_member_id (UUID)
- bonus_amount (DECIMAL)
- bonus_type (ENUM: 'video_earnings', 'referral')
- video_earnings_source (DECIMAL)
- percentage (DECIMAL) - 5% or 10%
```

---

## 📈 **Analytics & Reporting**

### **A-Level Analytics:**
- Total team size
- B-Level members count
- C-Level members count
- Total commissions earned
- Team bonuses earned
- Conversion rates

### **B-Level Analytics:**
- C-Level members count
- Referral commissions
- Team bonuses
- Video earnings

### **C-Level Analytics:**
- Video watching stats
- Total earnings
- Daily progress

---

## 🚀 **Implementation Priority**

### **Phase 1: Core System**
1. User signup with level assignment
2. Basic referral tracking
3. Video watching system
4. Simple commission calculation

### **Phase 2: Advanced Features**
1. Team bonus calculations
2. Multi-level tracking
3. Advanced analytics
4. Referral limits enforcement

### **Phase 3: Optimization**
1. Performance optimization
2. Advanced reporting
3. Mobile app features
4. Payment integration

---

This business logic ensures a sustainable multi-level referral system that encourages user growth while maintaining clear earning potential for all levels.

