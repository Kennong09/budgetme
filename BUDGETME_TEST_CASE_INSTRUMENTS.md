# BUDGETME TEST CASE INSTRUMENTS

## Overview
This document provides comprehensive test case instruments for the BudgetMe personal finance management system. The documentation covers testing scenarios for authentication, dashboard, budget management, transaction tracking, BudgetSense chatbot, family finance, goals, reports, AI predictions, and admin functionality.

**Directions**: Evaluate the BudgetMe system according to the scenarios outlined in this document. Follow each step carefully to ensure precise testing and accurate documentation. If the test case meets the expected outcome, mark it as "P" (Pass). If it does not meet the expected outcome, mark it as "F" (Fail) in the status column.

## Authentication Module

**Module Name**: Authentication  
**Role**: User/Admin

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 1 | Verify landing page accessibility | User can access the landing page without authentication | User has internet connection and valid browser | Navigate to landing page | Base URL | Landing page loads successfully with all feature descriptions | User can view public content | | |
| 2 | Verify user registration functionality | New user can register successfully | Valid email address and strong password requirements | Click "Sign Up" button | Valid email, password, full name | User account created successfully | User receives email verification | | |
|  |  |  |  | Enter valid email address | user@example.com |  |  | | |
|  |  |  |  | Enter full name | John Doe |  |  | | |
|  |  |  |  | Enter strong password | Password123! |  |  | | |
|  |  |  |  | Confirm password | Password123! |  |  | | |
|  |  |  |  | Click Register button |  |  |  | | |
| 3 | Verify user login functionality | Existing user can login successfully | User has valid registered account | Click "Sign In" button | Valid credentials | User logs in successfully | Redirect to dashboard | | |
|  |  |  |  | Enter email address | user@example.com |  |  | | |
|  |  |  |  | Enter password | Password123! |  |  | | |
|  |  |  |  | Click Login button |  |  |  | | |
| 4 | Verify invalid login credentials | Error message displayed for invalid credentials | User attempts login with wrong credentials | Enter invalid email | invalid@email.com | Login fails with error message | Redirect to login page | | |
|  |  |  |  | Enter password | wrongpassword |  |  | | |
|  |  |  |  | Click Login button |  |  |  | | |
| 5 | Verify password reset functionality | User can reset forgotten password | User has registered email address | Click "Forgot Password" link | Valid registered email | Password reset email sent | User receives reset instructions | | |
|  |  |  |  | Enter email address | user@example.com |  |  | | |
|  |  |  |  | Click Send Reset Link |  |  |  | | |
| 6 | Verify email verification process | User must verify email before full access | User registered but email not verified | Check email inbox | Verification email | Email verification successful | Full system access granted | | |
|  |  |  |  | Click verification link |  |  |  | | |
| 7 | Verify logout functionality | User can logout successfully | User is logged in | Click profile menu | N/A | User logs out successfully | Redirect to landing page | | |
|  |  |  |  | Click Logout button |  |  |  | | |

## User Dashboard Module

**Module Name**: User Dashboard  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 8 | Verify dashboard load functionality | User can access main dashboard | User is authenticated and logged in | Navigate to /dashboard | Valid session | Dashboard loads with overview cards | User sees financial summary | | |
| 9 | Verify dashboard data display | Dashboard shows current financial summary | User has transactions and budgets | View dashboard cards | Existing user data | Current balance, recent transactions, budget status displayed | Real-time data visible | | |
| 10 | Verify recent transactions display | Recent transactions appear on dashboard | User has transaction history | Check recent transactions section | Transaction data | Latest 5 transactions displayed | User can see recent activity | | |
| 11 | Verify budget progress display | Budget progress indicators show current status | User has active budgets | View budget progress cards | Budget data | Progress bars and percentages displayed | User sees budget health | | |
| 12 | Verify goal progress display | Financial goals progress visible | User has active goals | Check goals section | Goal data | Goal completion percentages shown | User tracks goal progress | | |
| 13 | Verify navigation functionality | User can navigate to different modules | User is on dashboard | Click navigation menu items | N/A | Successful navigation to selected modules | User accesses different features | | |

## BudgetSense Chatbot Module

**Module Name**: BudgetSense Chatbot  
**Role**: User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 14 | Verify chatbot visibility and accessibility | User can see and access the floating chatbot | User is on any page of the application | Locate chatbot button | N/A | Chatbot button visible in bottom-right corner | Chatbot ready for interaction | | |
| 15 | Verify chatbot opening functionality | User can open chatbot interface | Chatbot button is visible | Click chatbot button | N/A | Chatbot window opens with welcome message | Chat interface is active | | |
| 16 | Verify welcome message display | Chatbot displays personalized welcome message | User opens chatbot for first time | Open chatbot | User data | Welcome message appears with user's name | User sees greeting from BudgetSense | | |
| 17 | Verify unauthenticated user welcome | Chatbot displays generic welcome for guest users | User is not logged in | Open chatbot | N/A | Generic welcome message displayed | Guest user can interact with chatbot | | |
| 18 | Verify basic message sending | User can send messages to chatbot | Chatbot is open | Type message | "Hello" | Message appears in chat and response received | User can communicate with chatbot | | |
|  |  |  |  | Click send button |  |  |  | | |
| 19 | Verify message history display | Chat maintains conversation history | User has sent multiple messages | View chat window | Previous messages | All messages displayed in chronological order | User can review conversation | | |
| 20 | Verify suggested questions functionality | User can click on suggested questions | Chatbot is open with suggestions visible | Click suggested question | "How can I start budgeting effectively?" | Question sent and response received | User gets quick answers | | |
| 21 | Verify financial query processing | Chatbot responds to budget-related questions | Chatbot is active | Ask budget question | "What's the 50/30/20 rule?" | Relevant financial advice provided | User receives helpful guidance | | |
| 22 | Verify expense tracking guidance | Chatbot provides expense tracking help | User asks about expense tracking | Type expense question | "How do I track my expenses?" | Detailed expense tracking guidance provided | User learns expense management | | |
| 23 | Verify savings goal assistance | Chatbot helps with savings goals | User inquires about savings | Ask savings question | "Help me set up a savings goal" | Step-by-step savings guidance provided | User understands goal setting | | |
| 24 | Verify investment advice capability | Chatbot provides basic investment information | User asks about investments | Type investment question | "Should I invest my savings?" | Basic investment advice provided | User receives investment guidance | | |
| 25 | Verify debt management guidance | Chatbot offers debt management strategies | User asks about debt | Ask debt question | "How can I pay off my credit card debt?" | Debt reduction strategies provided | User gets debt management help | | |
| 26 | Verify budget planning assistance | Chatbot guides budget creation | User requests budget help | Ask budget planning question | "How do I create a monthly budget?" | Step-by-step budget planning guide provided | User learns budget creation | | |
| 27 | Verify error message handling | Chatbot handles invalid or unclear queries | User sends unclear message | Type unclear message | "asdfgh" | Clarification request or helpful suggestion provided | User guided to ask clearer questions | | |
| 28 | Verify message limit for unauthenticated users | System limits messages for non-logged-in users | User is not authenticated | Send multiple messages | 4 messages total | After 3 messages, login prompt appears | User prompted to sign in | | |
|  |  |  |  | Continue sending messages |  |  |  | | |
| 29 | Verify login prompt functionality | Login prompt appears when limit reached | Unauthenticated user hits message limit | Exceed message limit | N/A | Login prompt displayed with sign-in options | User encouraged to authenticate | | |
| 30 | Verify chatbot minimization | User can minimize chatbot window | Chatbot is open | Click minimize button | N/A | Chatbot minimizes to smaller window | Chat remains accessible but compact | | |
| 31 | Verify chatbot maximization | User can restore minimized chatbot | Chatbot is minimized | Click maximize button | N/A | Chatbot returns to full size | Full chat interface restored | | |
| 32 | Verify chatbot closing | User can close chatbot completely | Chatbot is open | Click close button | N/A | Chatbot closes with animation | Chat interface hidden | | |
| 33 | Verify chat history persistence | Chat history persists across sessions | User has previous conversation | Close and reopen chatbot | Previous conversation | Chat history maintained | User can continue conversation | | |
| 34 | Verify clear chat functionality | User can clear conversation history | Chat has message history | Click clear chat option | N/A | Chat history cleared, welcome message redisplayed | Fresh conversation started | | |
| 35 | Verify tooltip auto-display | Tooltip appears automatically to encourage usage | User is not interacting with chatbot | Wait for auto-tooltip | 7 seconds delay | Tooltip appears with helpful message | User aware of chatbot availability | | |
| 36 | Verify tooltip hide on hover | Tooltip hides when user hovers over chatbot | Tooltip is visible | Hover over chatbot button | N/A | Tooltip disappears | Clean interface without tooltip overlap | | |
| 37 | Verify loading state display | Loading indicator shows during response generation | User sends message | Send message and observe | Any valid question | Loading animation or indicator displayed | User knows system is processing | | |
| 38 | Verify response time handling | System handles slow responses gracefully | Network is slow or API delayed | Send message with slow response | Any question with delayed response | Loading state maintained until response | User experience remains smooth | | |
| 39 | Verify keyboard navigation | User can navigate chatbot using keyboard | Chatbot is open | Use Tab key to navigate | N/A | All interactive elements accessible via keyboard | Accessibility requirements met | | |
| 40 | Verify screen reader compatibility | Chatbot works with screen readers | Screen reader is active | Use screen reader | Screen reader software | All elements properly announced | Visually impaired users can use chatbot | | |
| 41 | Verify mobile responsiveness | Chatbot works properly on mobile devices | User accesses from mobile browser | Open chatbot on mobile | Mobile device | Chatbot interface adapts to mobile screen | Mobile users have good experience | | |
| 42 | Verify touch interaction | Touch gestures work on mobile devices | User is on mobile device | Use touch gestures | Touch interactions | All buttons and inputs respond to touch | Mobile interaction is intuitive | | |
| 43 | Verify model selection for authenticated users | Authenticated users can select different AI models | User is logged in | Access model selection | Different model options | User can choose from available models | Advanced users have model flexibility | | |
| 44 | Verify model restriction for guests | Guest users are restricted to default model | User is not authenticated | Attempt model change | Try to select premium model | Access denied, login prompt shown | Free tier limitations enforced | | |
| 45 | Verify conversation context retention | Chatbot maintains context throughout conversation | Multi-turn conversation active | Reference previous message | "What was my previous question?" | Chatbot references earlier conversation | Natural conversation flow maintained | | |
| 46 | Verify financial data integration | Chatbot can reference user's actual financial data | User is authenticated with data | Ask about personal finances | "How much did I spend last month?" | Chatbot provides personalized response using user data | Relevant personalized advice given | | |
| 47 | Verify privacy and security | Chatbot handles sensitive information appropriately | User shares personal financial details | Share sensitive information | Personal financial numbers | Information handled securely, no inappropriate storage | User privacy protected | | |
| 48 | Verify inappropriate content filtering | System filters inappropriate or harmful content | User attempts inappropriate content | Send inappropriate message | Offensive or harmful content | Content filtered, appropriate response given | Safe user environment maintained | | |
| 49 | Verify session timeout handling | System handles session timeouts gracefully | User session expires during chat | Wait for session timeout | Extended idle time | Appropriate message about session expiry | User guided to re-authenticate | | |
| 50 | Verify API error handling | System handles API failures gracefully | External API is unavailable | Send message during API failure | Any question | Error message displayed with retry option | User informed of technical issues | | |
| 51 | Verify rate limiting | System prevents spam and excessive usage | User sends many rapid messages | Send messages rapidly | Multiple quick messages | Rate limiting applied, user notified | System protected from abuse | | |
| 52 | Verify performance under load | Chatbot maintains performance with heavy usage | High system load | Use chatbot during peak times | Normal usage patterns | Response times remain acceptable | User experience unaffected by load | | |
| 53 | Verify integration with budget features | Chatbot can trigger budget-related actions | User is authenticated | Ask to create budget | "Help me create a new budget" | Chatbot guides to budget creation or provides direct action | Seamless integration with app features | | |
| 54 | Verify integration with goal features | Chatbot can assist with goal management | User has goals set up | Ask about goals | "How am I doing with my savings goal?" | Chatbot provides goal progress information | Integrated goal tracking assistance | | |
| 55 | Verify integration with transaction features | Chatbot can help with transaction queries | User has transaction history | Ask about transactions | "What were my biggest expenses this month?" | Chatbot analyzes and reports transaction data | Useful transaction insights provided | | |
| 56 | Verify quick action buttons | Chatbot provides quick action buttons for common tasks | Chat conversation active | Look for quick actions | Quick action prompts | Action buttons displayed for common tasks | User can quickly access features | | |
| 57 | Verify help and documentation access | Users can access help through chatbot | User needs assistance | Ask for help | "How do I use this app?" | Comprehensive help information provided | User gets guidance on app usage | | |
| 58 | Verify feedback collection | System collects user feedback on chatbot responses | User completes interaction | Rate chatbot response | Feedback prompt | User can provide rating and comments | System improves based on feedback | | |
| 59 | Verify accessibility color contrast | Chatbot interface meets accessibility color standards | User with vision impairment | Check color contrast | Visual inspection | All text meets WCAG contrast requirements | Accessible to users with vision impairments | | |
| 60 | Verify keyboard shortcuts | Power users can use keyboard shortcuts | User prefers keyboard navigation | Use keyboard shortcuts | Ctrl+Enter to send, Esc to close | Shortcuts work as expected | Efficient interaction for power users | | |
| 61 | Verify error recovery | System recovers gracefully from errors | Error occurs during interaction | Encounter system error | Trigger error condition | System recovers and continues functioning | Robust error handling implemented | | |
| 62 | Verify notification integration | Chatbot can trigger system notifications | Important financial event occurs | Receive financial alert | Budget exceeded notification | Chatbot notifies user of important events | Proactive financial management support | | |
| 63 | Verify voice input capability | Users can interact using voice input | Voice input is available | Use voice to send message | Spoken question | Voice converted to text and processed | Hands-free interaction possible | | |
| 64 | Verify offline behavior | System handles offline scenarios appropriately | Network connection lost | Use chatbot while offline | No internet connection | Appropriate offline message displayed | User informed of connectivity issues | | |
| 65 | Verify cross-browser compatibility | Chatbot works across different browsers | Multiple browsers available | Test in different browsers | Chrome, Firefox, Safari, Edge | Consistent functionality across browsers | Universal browser support | | |
| 66 | Verify customization options | Users can customize chatbot experience | User preferences available | Access customization settings | Theme, notification preferences | User can personalize chatbot settings | Tailored user experience | | |
| 67 | Verify compliance with regulations | System meets financial data regulations | Regulatory requirements apply | Audit compliance features | Financial data handling | System meets GDPR, PCI DSS requirements | Regulatory compliance maintained | | |
| 68 | Verify scalability testing | System handles increased user load | Load testing environment | Simulate high user volume | Multiple concurrent users | System maintains performance under load | Scalable architecture confirmed | | |
| 69 | Verify disaster recovery | System recovers from major failures | Disaster recovery scenario | Simulate system failure | Major system outage | System recovers and data is preserved | Business continuity ensured | | |
| 70 | Verify multi-language support | Chatbot responds in user's preferred language | User sets language preference | Change language setting | Different language | Chatbot responds in selected language | International users accommodated | | |
| 71 | Verify concurrent user support | Multiple users can use chatbot simultaneously | Multiple users active | Multiple users send messages | Concurrent usage | All users receive appropriate responses | System scales properly | | |
| 72 | Verify performance monitoring | System monitors chatbot performance metrics | Chatbot is in use | Monitor system metrics | Usage analytics | Performance data collected and analyzed | System optimization possible | | |
| 73 | Verify backup and recovery | Chat data is properly backed up | System backup process active | Verify data backup | Chat history | Data safely backed up and recoverable | User data protection ensured | | |
| 74 | Verify update notifications | Users are notified of chatbot improvements | System is updated | Check for update notifications | N/A | Users informed of new features | User awareness of improvements | | |
| 75 | Verify data export capability | Users can export chat conversations | User has chat history | Request conversation export | N/A | Chat history exported in readable format | User can save important advice | | |

## Budget Management Module

**Module Name**: Budget Management  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 76 | Verify budget creation functionality | User can create new budget | User is authenticated | Navigate to /budgets/create | Valid budget data | Budget created successfully | New budget appears in budget list | | |
|  |  |  |  | Enter budget name | Monthly Expenses |  |  | | |
|  |  |  |  | Set budget amount | 2000.00 |  |  | | |
|  |  |  |  | Select category | Food & Dining |  |  | | |
|  |  |  |  | Set start date | Current month start |  |  | | |
|  |  |  |  | Set end date | Current month end |  |  | | |
|  |  |  |  | Click Create Budget |  |  |  | | |
| 77 | Verify budget listing functionality | User can view all budgets | User has created budgets | Navigate to /budgets | Existing budgets | All user budgets displayed in list/grid | User sees budget overview | | |
| 78 | Verify budget details view | User can view detailed budget information | Budget exists | Click on budget item | Budget ID | Detailed budget view with transactions | User sees budget breakdown | | |
| 79 | Verify budget editing functionality | User can modify existing budget | Budget exists | Navigate to budget edit | Updated budget data | Budget updated successfully | Changes reflected in budget list | | |
|  |  |  |  | Click Edit Budget |  |  |  | | |
|  |  |  |  | Modify budget amount | 2500.00 |  |  | | |
|  |  |  |  | Click Save Changes |  |  |  | | |
| 80 | Verify budget deletion functionality | User can delete budget | Budget exists and user has permission | Click Delete Budget | Budget ID | Budget deleted successfully | Budget removed from list | | |
|  |  |  |  | Confirm deletion |  |  |  | | |
| 81 | Verify budget progress tracking | Budget shows accurate spending progress | Budget has associated transactions | View budget progress | Transaction data | Accurate progress calculation displayed | User sees spending vs budget | | |
| 82 | Verify budget alerts functionality | User receives alerts for budget limits | Budget nearing or exceeding limit | Trigger budget alert | Spending data | Alert notification displayed | User warned about budget status | | |

## Transaction Management Module

**Module Name**: Transaction Management  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 83 | Verify transaction creation functionality | User can add new transaction | User is authenticated | Navigate to /transactions/add | Valid transaction data | Transaction created successfully | New transaction appears in list | | |
|  |  |  |  | Select transaction type | Expense |  |  | | |
|  |  |  |  | Enter amount | 150.00 |  |  | | |
|  |  |  |  | Select category | Groceries |  |  | | |
|  |  |  |  | Enter description | Weekly grocery shopping |  |  | | |
|  |  |  |  | Set date | Today's date |  |  | | |
|  |  |  |  | Click Add Transaction |  |  |  | | |
| 84 | Verify transaction listing functionality | User can view all transactions | User has transaction history | Navigate to /transactions | Existing transactions | All user transactions displayed | User sees transaction history | | |
| 85 | Verify transaction filtering functionality | User can filter transactions by criteria | Multiple transactions exist | Apply date filter | Filter criteria | Filtered results displayed | User sees relevant transactions | | |
|  |  |  |  | Select date range | Last 30 days |  |  | | |
|  |  |  |  | Apply filter |  |  |  | | |
| 86 | Verify transaction search functionality | User can search transactions | Multiple transactions exist | Enter search term | Search keyword | Matching transactions displayed | User finds specific transactions | | |
|  |  |  |  | Search by description | "grocery" |  |  | | |
| 87 | Verify transaction editing functionality | User can modify existing transaction | Transaction exists | Navigate to transaction edit | Updated transaction data | Transaction updated successfully | Changes reflected in transaction list | | |
|  |  |  |  | Click Edit Transaction |  |  |  | | |
|  |  |  |  | Modify amount | 175.00 |  |  | | |
|  |  |  |  | Click Save Changes |  |  |  | | |
| 88 | Verify transaction deletion functionality | User can delete transaction | Transaction exists | Click Delete Transaction | Transaction ID | Transaction deleted successfully | Transaction removed from list | | |
|  |  |  |  | Confirm deletion |  |  |  | | |
| 89 | Verify transaction categorization | Transactions are properly categorized | User adds transactions with categories | View categorized transactions | Category data | Transactions grouped by category | User sees organized transaction data | | |

## Financial Goals Module

**Module Name**: Financial Goals  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 90 | Verify goal creation functionality | User can create new financial goal | User is authenticated | Navigate to /goals/create | Valid goal data | Goal created successfully | New goal appears in goals list | | |
|  |  |  |  | Enter goal name | Emergency Fund |  |  | | |
|  |  |  |  | Set target amount | 10000.00 |  |  | | |
|  |  |  |  | Set target date | 12 months from now |  |  | | |
|  |  |  |  | Enter description | 6 months of expenses |  |  | | |
|  |  |  |  | Click Create Goal |  |  |  | | |
| 91 | Verify goal listing functionality | User can view all goals | User has created goals | Navigate to /goals | Existing goals | All user goals displayed | User sees goal overview | | |
| 92 | Verify goal contribution functionality | User can contribute to goals | Goal exists | Navigate to goal contribution | Contribution amount | Contribution recorded successfully | Goal progress updated | | |
|  |  |  |  | Enter contribution amount | 500.00 |  |  | | |
|  |  |  |  | Add optional note | Monthly savings |  |  | | |
|  |  |  |  | Click Contribute |  |  |  | | |
| 93 | Verify goal progress tracking | Goal shows accurate progress | Goal has contributions | View goal progress | Contribution data | Progress percentage calculated correctly | User sees goal advancement | | |
| 94 | Verify goal editing functionality | User can modify existing goal | Goal exists | Navigate to goal edit | Updated goal data | Goal updated successfully | Changes reflected in goals list | | |
|  |  |  |  | Click Edit Goal |  |  |  | | |
|  |  |  |  | Modify target amount | 12000.00 |  |  | | |
|  |  |  |  | Click Save Changes |  |  |  | | |
| 95 | Verify goal deletion functionality | User can delete goal | Goal exists | Click Delete Goal | Goal ID | Goal deleted successfully | Goal removed from list | | |
|  |  |  |  | Confirm deletion |  |  |  | | |

## Family Finance Module

**Module Name**: Family Finance  
**Role**: Family Member

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 96 | Verify family creation functionality | User can create new family | User is authenticated | Navigate to /family/create | Valid family data | Family created successfully | User becomes family administrator | | |
|  |  |  |  | Enter family name | Smith Family |  |  | | |
|  |  |  |  | Add description | Our family budget |  |  | | |
|  |  |  |  | Set privacy settings | Private |  |  | | |
|  |  |  |  | Click Create Family |  |  |  | | |
| 97 | Verify family invitation functionality | Family admin can invite members | User is family admin | Navigate to invite member | Valid email address | Invitation sent successfully | Invited user receives invitation | | |
|  |  |  |  | Enter member email | member@example.com |  |  | | |
|  |  |  |  | Select role | Member |  |  | | |
|  |  |  |  | Click Send Invitation |  |  |  | | |
| 98 | Verify family join functionality | User can join family via invitation | User received family invitation | Click invitation link | Invitation token | User joins family successfully | User has access to family finances | | |
|  |  |  |  | Accept invitation |  |  |  | | |
| 99 | Verify family dashboard access | Family members can view family dashboard | User is family member | Navigate to family dashboard | Family data | Family financial overview displayed | Members see shared finances | | |
| 100 | Verify family member management | Admin can manage family members | User is family admin | Navigate to family members | Member list | Member management interface displayed | Admin can modify member roles | | |
| 101 | Verify family goal creation | Family can create shared goals | User is family member | Create family goal | Shared goal data | Family goal created successfully | All members can contribute | | |
|  |  |  |  | Enter goal name | Family Vacation |  |  | | |
|  |  |  |  | Set target amount | 5000.00 |  |  | | |
|  |  |  |  | Mark as family goal | Yes |  |  | | |
|  |  |  |  | Click Create Goal |  |  |  | | |

## Reports Module

**Module Name**: Financial Reports  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 102 | Verify expense report generation | User can generate expense reports | User has transaction data | Navigate to /reports | Report parameters | Expense report generated successfully | User views detailed expense analysis | | |
|  |  |  |  | Select report type | Expense Analysis |  |  | | |
|  |  |  |  | Set date range | Last 3 months |  |  | | |
|  |  |  |  | Click Generate Report |  |  |  | | |
| 103 | Verify income report generation | User can generate income reports | User has income transactions | Generate income report | Income data | Income report displayed with charts | User sees income trends | | |
| 104 | Verify budget vs actual report | User can compare budget to actual spending | User has budgets and transactions | Generate comparison report | Budget and spending data | Variance analysis displayed | User sees budget performance | | |
| 105 | Verify report export functionality | User can export reports to various formats | Report is generated | Click export options | PDF, Excel formats | Report exported successfully | User can save and share reports | | |
| 106 | Verify report filtering | User can filter reports by categories | Report contains multiple categories | Apply category filter | Specific categories | Filtered report displayed | User sees targeted data | | |
| 107 | Verify report visualization | Reports display charts and graphs | Report data available | View report visualizations | Chart data | Interactive charts displayed | User understands data visually | | |

## AI Predictions Module

**Module Name**: AI Predictions  
**Role**: Authenticated User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 108 | Verify prediction generation | User can generate financial predictions | User has sufficient transaction history | Navigate to /predictions | Historical data | Financial forecast generated | User sees future spending predictions | | |
|  |  |  |  | Select prediction type | Expense Forecast |  |  | | |
|  |  |  |  | Set prediction period | Next 3 months |  |  | | |
|  |  |  |  | Click Generate Prediction |  |  |  | | |
| 109 | Verify AI insights display | System shows AI-generated insights | Predictions are generated | View insights section | Prediction data | Actionable insights displayed | User receives personalized advice | | |
| 110 | Verify prediction accuracy indicators | System shows confidence levels | Predictions exist | Check accuracy metrics | Statistical data | Confidence intervals displayed | User understands prediction reliability | | |
| 111 | Verify prediction export | User can export prediction data | Predictions are available | Export predictions | Various formats | Prediction data exported | User can save forecasts | | |
| 112 | Verify prediction error handling | System handles insufficient data gracefully | User has minimal transaction history | Attempt prediction generation | Limited data | Appropriate error message displayed | User informed about data requirements | | |

## Admin Dashboard Module

**Module Name**: Admin Dashboard  
**Role**: System Administrator

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| 113 | Verify admin login functionality | Administrator can access admin panel | Valid admin credentials exist | Navigate to /admin | Admin credentials | Admin dashboard loads successfully | Admin can manage system | | |
|  |  |  |  | Enter admin username | admin@budgetme.com |  |  | | |
|  |  |  |  | Enter admin password | AdminPass123! |  |  | | |
|  |  |  |  | Click Admin Login |  |  |  | | |
| 114 | Verify user management functionality | Admin can manage user accounts | Admin is logged in | Navigate to user management | User data | User list displayed with management options | Admin can modify user accounts | | |
| 115 | Verify system settings management | Admin can modify system configurations | Admin has system access | Access system settings | Configuration options | Settings interface displayed | Admin can update system parameters | | |
| 116 | Verify analytics and reporting | Admin can view system analytics | System has usage data | Navigate to analytics dashboard | Usage statistics | Comprehensive analytics displayed | Admin sees system performance metrics | | |
| 117 | Verify user suspension functionality | Admin can suspend user accounts | Problem user exists | Select user to suspend | User account | User account suspended successfully | User cannot access system | | |
|  |  |  |  | Click Suspend User |  |  |  | | |
|  |  |  |  | Confirm suspension |  |  |  | | |
| 118 | Verify system backup management | Admin can manage system backups | Backup system is configured | Access backup management | Backup options | Backup interface displayed | Admin can create and restore backups | | |
| 119 | Verify audit log viewing | Admin can view system audit logs | System logging is active | Navigate to audit logs | System activity | Detailed audit trail displayed | Admin can track system activities | | |

## Summary

This comprehensive test case documentation covers 119 test scenarios across all BudgetMe modules, with the BudgetSense chatbot module containing 62 detailed test cases as specified. Each test case includes detailed steps, specific test data, expected results, and post-conditions to ensure thorough UI-based testing coverage.