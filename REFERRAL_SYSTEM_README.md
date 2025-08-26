# Referral System Implementation

## Overview

This document describes the implementation of a comprehensive referral system for the TaskMaster video platform. The system includes user signup with referral links, membership levels, video watching with daily limits, and multiple earning mechanisms.

## Business Model

### 1. User Signup & Referral System

#### Referral Link Signup
- **With Referral Link**: New user becomes a **B-level member** (downline of the referrer)
- **Without Referral Link**: New user becomes an **A-level member** (direct user)
- **Default Status**: Every new user starts as an **Intern**

#### Referral Benefits
- Referrer gets commission when someone joins using their link
- B-level members are assigned to their referrer as team members
- Team leaders earn bonuses from their team members' activities

### 2. Free Trial System

#### Intern Benefits
- **5 free videos per day** for **3 days**
- After trial, user must join a VIP plan to continue watching videos
- No earnings during trial period

### 3. VIP Membership Plans

#### Plan Tiers
- **Basic VIP**: 20 videos/day - Rs. 500/month
- **Premium VIP**: 50 videos/day - Rs. 1000/month  
- **Ultimate VIP**: 100 videos/day - Rs. 2000/month

#### Plan Benefits
- Higher daily video limits
- Priority support
- Exclusive content access
- Team leader bonuses (Premium+ plans)

### 4. Earning Mechanisms

#### Three Ways to Earn:
1. **Video Watching**: Earn money by watching videos (daily limit based on plan)
2. **Referral Commissions**: Earn when someone joins using your link and buys a plan
3. **Team Leader Bonuses**: Earn extra from team members' video watching activities

## Database Schema

### Core Tables

#### `user_profiles`
- User information and membership details
- Referral relationships and team structure
- Earnings tracking and video limits

#### `membership_plans`
- Available VIP plans with pricing and limits
- Plan features and duration

#### `user_plans`
- User subscriptions to VIP plans
- Plan activation and expiration dates

#### `videos`
- Available videos for watching
- Video metadata and rewards

#### `video_watches`
- Tracking of video watching activities
- Daily limits and earnings

#### `referral_commissions`
- Referral earnings and commission tracking
- Commission types and status

#### `team_leader_earnings`
- Team leader bonuses from team activities
- Earnings from team members

### Key Functions

#### `generate_referral_code()`
- Generates unique 6-digit referral codes
- Ensures uniqueness across all users

#### `get_user_video_limit(user_uuid)`
- Calculates user's current daily video limit
- Considers trial status, VIP plans, and membership level

#### `can_watch_video(user_uuid)`
- Checks if user can watch more videos today
- Resets daily count for new days

#### `process_video_watch(user_uuid, video_uuid)`
- Processes video watching and earnings
- Updates user stats and team leader bonuses
- Returns earned amount

#### `process_referral_signup(new_user_id, referrer_code)`
- Processes new user signup with referral
- Sets up referral relationships
- Creates initial commission

## Frontend Components

### 1. Updated Signup Component (`src/pages/auth/Signup.tsx`)
- Handles referral code from URL parameters
- Creates user profile with appropriate membership level
- Processes referral relationships and commissions

### 2. Videos Page (`src/pages/Videos.tsx`)
- Displays available videos for watching
- Shows user's daily progress and limits
- Handles video watching with earnings
- Prompts for VIP upgrade when limits reached

### 3. Plans Page (`src/pages/Plans.tsx`)
- Displays available VIP membership plans
- Handles plan selection and purchase
- Shows plan features and benefits

### 4. Referrals Page (`src/pages/Referrals.tsx`)
- Shows user's referral code and link
- Displays team members and their status
- Tracks referral commissions and earnings
- Provides sharing functionality

## Key Features

### Referral Link System
- Unique 6-digit referral codes for each user
- URL-based referral tracking (`/signup?ref=CODE`)
- Automatic referral code detection and application

### Membership Levels
- **Intern**: Free trial users (5 videos/day for 3 days)
- **A-Level**: Direct users (no referral)
- **B-Level**: Referred users (under referrer's team)

### Video Watching System
- Daily limits based on membership type
- Automatic daily reset
- Earnings tracking per video
- Team leader bonuses for B-level members

### Earning System
- **Video Earnings**: Direct earnings from watching videos
- **Referral Earnings**: Commissions from signups
- **Team Earnings**: Bonuses from team member activities

## Setup Instructions

### 1. Database Setup
Run the SQL schema in `referral_system_schema.sql` in your Supabase SQL editor:

```sql
-- Execute the entire referral_system_schema.sql file
-- This creates all necessary tables, functions, and sample data
```

### 2. Frontend Integration
The new components are already integrated into the routing system:

- `/dashboard/videos` - Video watching page
- `/dashboard/plans` - VIP membership plans
- `/dashboard/referrals` - Referral dashboard
- `/signup?ref=CODE` - Signup with referral code

### 3. Testing the System

#### Test Referral Flow:
1. Create a user account (becomes A-level)
2. Copy their referral code from the Referrals page
3. Use the referral link to create another account
4. Verify the new user becomes B-level
5. Check referral commission is created

#### Test Video Watching:
1. Login as a user
2. Go to Videos page
3. Watch videos and verify earnings
4. Check daily limits are enforced
5. Test VIP upgrade flow

#### Test VIP Plans:
1. Go to Plans page
2. Select a plan
3. Complete purchase (simulated)
4. Verify video limits increase
5. Check VIP status in profile

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS policies enabled
- Users can only access their own data
- Referral relationships are properly secured

### Data Validation
- Referral codes are validated before processing
- Video limits are enforced at database level
- Commission calculations are handled server-side

### Authentication
- All operations require user authentication
- Referral processing is tied to authenticated users
- Team relationships are validated

## Future Enhancements

### Potential Improvements:
1. **Multi-level Referrals**: Extend beyond single-level referrals
2. **Advanced Analytics**: Detailed earning reports and trends
3. **Payment Integration**: Real payment gateway integration
4. **Notification System**: Real-time notifications for earnings
5. **Leaderboards**: Competitive referral leaderboards
6. **Achievement System**: Milestones and rewards for referrals

### Scalability Considerations:
1. **Database Indexing**: Optimized queries for large user bases
2. **Caching**: Redis caching for frequently accessed data
3. **Background Jobs**: Async processing for commission calculations
4. **Rate Limiting**: Prevent abuse of video watching system

## Troubleshooting

### Common Issues:

#### Referral Code Not Working
- Check if referral code exists in database
- Verify user is not trying to refer themselves
- Ensure referral code format is correct

#### Video Limits Not Updating
- Check if user has active VIP plan
- Verify trial status and expiration
- Ensure daily reset is working properly

#### Commission Not Generated
- Check referral relationship is properly set
- Verify commission function is called
- Ensure user profiles exist for both users

### Debug Queries:

```sql
-- Check user's current video limit
SELECT get_user_video_limit('user-uuid-here');

-- Check referral relationships
SELECT * FROM user_profiles WHERE referral_code = 'CODE';

-- Check user's earnings
SELECT total_earnings, total_referral_earnings, total_team_earnings 
FROM user_profiles WHERE user_id = 'user-uuid-here';
```

## Support

For technical support or questions about the referral system implementation, please refer to the codebase documentation or contact the development team.


