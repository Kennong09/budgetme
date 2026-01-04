# Common Components

This directory contains reusable utility components for the BudgetMe application.

## FormattedAIText

A utility component for consistently formatting AI-generated text content. This component solves common issues with AI text rendering such as run-on text, improper line breaks, and unformatted bullet points.

### Features

- **Automatic Text Formatting**: Prevents run-on text by preserving line breaks and paragraphs
- **Bullet Point Detection**: Automatically detects and renders bullet points as properly formatted lists
- **Markdown Support**: Handles basic markdown formatting (bold, italic)
- **Currency Formatting**: Highlights currency values and percentages
- **Word Wrapping**: Ensures proper text wrapping with `break-word` and `overflow-wrap`
- **Accessibility**: Proper semantic markup for screen readers

### Usage

```tsx
import FormattedAIText from '../common/FormattedAIText';

// Basic usage
<FormattedAIText 
  text={aiGeneratedText} 
/>

// With custom styling
<FormattedAIText 
  text={aiGeneratedText} 
  className="text-sm font-weight-medium"
/>

// Different modes (future enhancement)
<FormattedAIText 
  text={markdownText} 
  mode="markdown"
  className="custom-class"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | required | The AI-generated text to format |
| `mode` | `'plain' \| 'markdown'` | `'plain'` | Formatting mode (markdown mode reserved for future use) |
| `className` | `string` | `''` | Additional CSS classes to apply |

### Text Processing

The component processes text through several stages:

1. **Normalization**: Cleans up line endings and excessive whitespace
2. **Paragraph Detection**: Splits text by double line breaks
3. **Bullet Point Detection**: Identifies lists using patterns:
   - `- `, `* `, `+ `, `• ` (bullet points)
   - `1. `, `1) ` (numbered lists)
   - `Priority X - ` (priority lists)
4. **Formatting**: Applies markdown-style formatting (bold, italic)
5. **Currency Highlighting**: Emphasizes currency values and percentages

### Examples

#### Input Text
```
You're currently earning ₱947,988 a month and spending ₱789,990, leaving a net cash flow of ₱157,998. That gives you a 16.7% savings rate, but your "Other" spending is projected to jump by ₱236,997 next month.

Priority 1 - Break down the "Other" category into concrete sub-categories
Priority 2 - Set realistic caps for each category using BudgetMe's budgeting tool
```

#### Rendered Output
- Properly spaced paragraphs with highlighted currency values
- Priority list items rendered as a formatted list
- Bold highlighting for monetary values and percentages

### Integration in AI Predictions

This component is specifically designed for use in AI prediction components:

- **AIInsightsCard**: For formatting AI-generated financial insights
- **PredictionSummary**: For formatting prediction summaries
- **RecommendationCards**: For formatting AI recommendations

### Best Practices

1. **Always Use for AI Content**: Use this component for any AI-generated text to ensure consistent formatting
2. **Preserve Original Data**: Pass the raw AI response text without pre-processing
3. **Custom Styling**: Use the `className` prop for component-specific styling
4. **Error Handling**: The component handles empty or null text gracefully

### Troubleshooting

#### Text Still Running Together
- Ensure AI responses include proper line breaks (`\n` or `\r\n`)
- Check if the AI service is returning properly formatted text

#### Lists Not Formatting Properly
- Verify bullet points follow supported patterns (-, *, +, •, 1., 1))
- Ensure there's a space after the bullet point marker

#### Long Words Causing Layout Issues
- The component applies `word-break: break-word` by default
- For extremely long URLs or technical terms, consider preprocessing

### Future Enhancements

- [ ] Support for full markdown parsing mode
- [ ] Code syntax highlighting
- [ ] Table formatting support
- [ ] Custom bullet point patterns
- [ ] Emoji and icon replacement