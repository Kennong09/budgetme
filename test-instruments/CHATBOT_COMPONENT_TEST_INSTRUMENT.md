# CHATBOT COMPONENT TEST INSTRUMENT

## Overview
This document provides comprehensive test case instruments for the Chatbot Component module of the BudgetMe system. The Chatbot module includes the floating chatbot interface, chat window functionality, message handling, code viewing, table viewing, and chat tooltip features.

**Directions**: Evaluate the Chatbot Component module according to the scenarios outlined in this document. Follow each step carefully to ensure precise testing and accurate documentation. If the test case meets the expected outcome, mark it as "P" (Pass). If it does not meet the expected outcome, mark it as "F" (Fail) in the status column.

## Chatbot Component Module

**Module Name**: Chatbot Component  
**Role**: User

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status(Pass/Fail) |
|-------------|---------------|-----------|--------------|------------|-----------|----------------|----------------|---------------|------------------|
| CHAT001 | Verify floating chatbot visibility | Floating chatbot button is visible on all pages | User is on any page of the application | Locate floating chatbot button | N/A | Chatbot button visible in fixed position | Chatbot ready for user interaction | | |
| CHAT002 | Verify floating chatbot positioning | Chatbot button maintains proper position during page scroll | Chatbot button is visible | Scroll page up and down | Page scroll actions | Chatbot button remains in fixed position | Chatbot always accessible during navigation | | |
| CHAT003 | Verify chatbot opening animation | Chatbot opens with smooth animation | Chatbot button is visible | Click chatbot button | N/A | Chatbot window opens with animation | Chat interface becomes active | | |
| CHAT004 | Verify chat window display | Chat window renders properly with all components | Chatbot is opened | View chat window interface | Chat window | All chat components displayed correctly | User can see chat interface elements | | |
| CHAT005 | Verify chat window header functionality | Chat window header displays proper title and controls | Chat window is open | View chat window header | Header elements | Header displays title and control buttons | User can identify chat purpose and controls | | |
| CHAT006 | Verify chat message sending | User can send messages through chat interface | Chat window is open | Type and send message | "Hello BudgetSense" | Message sent and displayed in chat | User can communicate with chatbot | | |
|  |  |  |  | Type message in input field |  |  |  | | |
|  |  |  |  | Click send button or press Enter |  |  |  | | |
| CHAT007 | Verify message bubble rendering | Messages display in proper bubble format | Messages exist in chat | View message bubbles | Chat messages | Messages displayed in bubble format with proper styling | User can distinguish between user and bot messages | | |
| CHAT008 | Verify chat message history | Chat maintains conversation history | Multiple messages exchanged | View message history | Previous messages | All messages displayed in chronological order | User can review entire conversation | | |
| CHAT009 | Verify chat input validation | Chat input handles various message types | Chat is active | Send different message types | Various message formats | All valid messages accepted and processed | System handles diverse input properly | | |
| CHAT010 | Verify chat emoji support | Chat supports emoji in messages | Chat is active | Send message with emojis | Message with emoji characters | Emojis displayed correctly in chat | User can express emotions through emojis | | |
| CHAT011 | Verify chat tooltip functionality | Chat tooltip appears when hovering over chatbot | Chatbot button is visible | Hover over chatbot button | Hover action | Tooltip appears with helpful text | User gets guidance about chatbot feature | | |
| CHAT012 | Verify chat tooltip content | Tooltip displays appropriate guidance text | Tooltip is triggered | View tooltip content | Tooltip text | Helpful guidance text displayed | User understands chatbot purpose | | |
| CHAT013 | Verify chat tooltip auto-hide | Tooltip disappears automatically after delay | Tooltip is visible | Wait for auto-hide timeout | Time delay | Tooltip disappears after specified time | Clean interface without persistent tooltip | | |
| CHAT014 | Verify code viewer functionality | Code viewer displays code snippets properly | Chatbot provides code response | View code in code viewer | Code snippet data | Code displayed with proper syntax highlighting | User can read code clearly | | |
| CHAT015 | Verify code viewer syntax highlighting | Code viewer applies correct syntax highlighting | Code is displayed in viewer | View different code types | Various programming languages | Appropriate syntax highlighting applied | User can understand code structure | | |
| CHAT016 | Verify code viewer copy functionality | User can copy code from code viewer | Code is displayed | Copy code from viewer | Code content | Code copied to clipboard successfully | User can reuse provided code | | |
| CHAT017 | Verify table viewer functionality | Table viewer displays tabular data properly | Chatbot provides table response | View table in table viewer | Tabular data | Table displayed with proper formatting | User can read tabular information clearly | | |
| CHAT018 | Verify table viewer sorting | Table viewer allows sorting of columns | Table is displayed | Sort table by different columns | Table sort actions | Table data sorted correctly | User can organize table data | | |
| CHAT019 | Verify table viewer filtering | Table viewer supports data filtering | Table with multiple rows displayed | Apply filters to table data | Filter criteria | Table data filtered according to criteria | User can find specific information | | |
| CHAT020 | Verify chat window minimization | Chat window can be minimized | Chat window is open | Click minimize button | Minimize action | Chat window minimizes to smaller size | Chat remains accessible but less intrusive | | |
| CHAT021 | Verify chat window maximization | Minimized chat can be restored to full size | Chat window is minimized | Click maximize/restore button | Maximize action | Chat window returns to full size | Full chat functionality restored | | |
| CHAT022 | Verify chat window closing | Chat window can be closed completely | Chat window is open | Click close button | Close action | Chat window closes completely | Chat interface hidden from view | | |
| CHAT023 | Verify chat window resizing | Chat window can be resized by user | Chat window is open | Drag window resize handles | Resize actions | Chat window size adjusts accordingly | User can customize chat window size | | |
| CHAT024 | Verify chat persistence across pages | Chat state persists when navigating between pages | Chat is active with messages | Navigate to different pages | Page navigation | Chat state and messages maintained | User can continue conversation across pages | | |
| CHAT025 | Verify chat scroll functionality | Chat window properly handles message overflow | Chat has many messages | View long conversation | Multiple messages | Chat area scrolls to show all messages | User can access entire conversation history | | |
| CHAT026 | Verify chat auto-scroll | Chat automatically scrolls to newest messages | New messages are received | Receive new bot responses | Incoming messages | Chat automatically scrolls to show latest message | User always sees newest conversation | | |
| CHAT027 | Verify chat loading states | Chat shows loading indicators during processing | User sends message | Send message requiring processing | Message requiring API call | Loading indicator displayed during processing | User knows system is working | | |
| CHAT028 | Verify chat error handling | Chat handles connection errors gracefully | Chat encounters network error | Simulate network failure | Network error condition | Error message displayed with retry option | User informed of technical issues | | |
| CHAT029 | Verify chat accessibility features | Chat interface supports accessibility features | Screen reader or keyboard navigation | Use accessibility tools | Accessibility software | Chat interface accessible via assistive technologies | Users with disabilities can use chat | | |
| CHAT030 | Verify chat mobile responsiveness | Chat interface works properly on mobile devices | User accesses chat on mobile | Open chat on mobile device | Mobile browser | Chat interface adapts to mobile screen | Mobile users have full chat functionality | | |
| CHAT031 | Verify chat touch interactions | Touch gestures work properly on mobile | User uses touch device | Use touch gestures in chat | Touch interactions | All chat elements respond to touch properly | Intuitive mobile chat experience | | |
| CHAT032 | Verify chat keyboard shortcuts | Keyboard shortcuts work in chat interface | Chat is active | Use keyboard shortcuts | Keyboard combinations | Shortcuts perform expected actions | Power users can use chat efficiently | | |
| CHAT033 | Verify chat performance optimization | Chat maintains performance with long conversations | Chat has extensive message history | Use chat with many messages | Large conversation history | Chat remains responsive with message history | System handles long conversations well | | |
| CHAT034 | Verify chat data privacy | Chat handles sensitive information appropriately | User shares personal data | Share financial information in chat | Sensitive personal data | Data handled according to privacy policies | User privacy protected | | |
| CHAT035 | Verify chat integration with app features | Chat integrates with main application features | Chat and app features are active | Use chat to access app functions | Integration commands | Chat successfully integrates with app features | Seamless experience between chat and app | | |