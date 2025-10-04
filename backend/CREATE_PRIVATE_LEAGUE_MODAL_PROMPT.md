# Create Private League Modal - Updated Figma Prompt

**Create a "Create Private League" modal dialogue with the following layout and requirements:**

**Modal Structure:**
- Centered modal overlay with backdrop
- Modal title: "Create Private League"
- Close button (X) in top-right corner

**Form Sections (in order):**

**1. Basic Information:**
- League name input field (required)
- League description textarea (optional)
- Character count indicators for both fields

**2. League Format Selection:**
- Radio button group with options:
  - Classic (default)
  - Head-to-Head
- Brief description under each option

**3. Entry Settings:**
- Entry type toggle: Free/Paid
- Entry fee input (appears when Paid selected)
- Currency display (GHS)
- Fee range indicator (GHS 10-50)

**4. League Size:**
- Max teams input field
- Range indicator (2-400 teams)
- Current team count display

**5. Gameweek Settings:**
- Season dropdown (current year default)
- Start gameweek dropdown (future gameweeks only)
- "Cannot start in past gameweeks" warning

**6. Prize Distribution:**
- Distribution type selector:
  - Top 3 (60%, 30%, 10%)
  - Top 5 (customizable percentages)
  - Winner takes all (100%)
- Prize preview calculator
- Platform fee notice (5%)

**7. Advanced Settings (collapsible section):**
- Include chip scores toggle
- Include transfer costs toggle
- Knockout rounds (for H2H leagues only)

**8. League Code Generation:**
- Auto-generated code display
- "Regenerate Code" button
- Code sharing instructions
- "Copy Code" button

**9. Summary Section:**
- League overview card
- Entry fee total
- Platform fee breakdown
- Estimated prize pool
- Max participants

**Action Buttons:**
- "Cancel" button (secondary style)
- "Create League" button (primary style)
- "Save as Draft" button (if applicable)

**Validation & Error States:**
- Required field indicators
- Invalid input error messages
- Duplicate name warning
- Insufficient wallet balance warning
- Network error messages

**Success State:**
- Success message: "League created successfully!"
- Generated league code (prominent display)
- "Share Code" button
- "View League" button
- "Create Another" button

**Loading States:**
- Loading spinner during creation
- Disabled form during submission
- Progress indicator for multi-step process

**Help & Guidance:**
- Info tooltips for complex fields
- "Learn more" links for league formats
- Example league codes
- Best practices tips

**Responsive Considerations:**
- Mobile-friendly form layout
- Proper spacing and touch targets
- Scrollable content sections
- Collapsible sections for mobile

**Accessibility:**
- Clear form labels and descriptions
- Proper focus management
- Error message associations
- Keyboard navigation support

**Content Hierarchy:**
1. Modal title
2. Basic information
3. League format
4. Entry settings
5. League size
6. Gameweek settings
7. Prize distribution
8. Advanced settings
9. League code
10. Summary
11. Action buttons

**Key User Flows:**
- Fill form → Validate inputs → Preview summary → Create league → Get code → Share
- Handle validation errors gracefully
- Allow saving as draft
- Provide clear next steps after creation

**Smart Features:**
- Auto-save draft as user types
- Real-time validation feedback
- Smart defaults based on user preferences
- Duplicate name checking
- Gameweek availability checking

**League Format Options:**
- **Classic**: Traditional points-based ranking
- **Head-to-Head**: Direct matchups between teams

**Note:** Custom league format has been removed. Only Classic and Head-to-Head formats are supported.
