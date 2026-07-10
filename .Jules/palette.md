## 2026-07-05 - [Loading State Feedback]
**Learning:** Adding immediate visual feedback (spinners and stateful text) to authentication buttons prevents multiple clicks and reassures users during network-latency-prone operations like auth.
**Action:** Always check form submit buttons for loading states and implement them using the 'isPending' or 'isSubmitting' flags from 'useTransition' or 'react-hook-form'.
