---
name: prompt-engineering
description: Standards and guidelines for Prompt Engineering. Integrates advanced engineering patterns (Persona, Context, Strict Schemas, Chain of Thought, Progressive Rounds, and Human-AI critique). Use when designing system instructions, prompt templates, or user-query wrappers.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["prompt engineering", "CoT", "RTCRO", "plantilla de prompt"]
  scope: [global, project]
  version: "1.0.0"
---

# 📝 Prompt Engineering Standards

Use this skill when designing system instructions, prompt templates, or user-query wrappers for the [APP] assistant.

---

## 🚨 Advanced Prompt Engineering Patterns

### 1. Persona/Role Pattern
- Direct the model to act as a specific expert. This calibrates the tone, style, and depth of the response.
- **Example**: *"You are a Senior Customer Relations Manager at a premium supermarket. Your tone is highly professional, polite, and brief."*

### 2. Context & Constraints
- Provide explicit background details and strict constraints to prevent hallucinations.
- **Example**: *"Only use the items listed in <order_context>. Do not invent or assume products that are not present. If the item is out of stock, say 'UNAVAILABLE'."*

### 3. Strict Output Formats (JSON/Tables)
- Enforce structured outputs for automated processing. Provide schema definitions and ask the model to omit conversational prefixes or wrappers.
- **Example**: *"Return ONLY a valid JSON object. Do not include markdown backticks (`json` or `) in the response."*

### 4. Chain of Thought (CoT)
- Instruct the model to think step-by-step before outputting the final result. This significantly increases reasoning accuracy for logistical calculations (like matching alternative products or identifying delivery routing issues).
- **Example**: *"First, list the similarities between the missing item and the replacements. Second, check if the replacement is in stock. Third, output the final JSON replacement recommendation."*

### 5. Progressive Prompting (Rounds)
- Break down complex, long-running agent workflows into sequential prompts.
- **Example**:
  - *Round 1*: Analyze the customer ticket and classify the problem category.
  - *Round 2*: Take the category from Round 1 and retrieve matching database entities to formulate a response.
  - *Round 3*: Perform safety checks on the response before displaying it to the client.

### 6. Human-AI Collaborative Loop
- Leverage the AI as a critique editor. Any critical operation (such as processing stock substitutions or initiating delivery dispatch) must display a preview in the Admin Panel for human review before database write.

---

## 🛒 [APP] Prompt Template (SOLID / CoT Edition)

```markdown
<instructions>
You are the AI Assistant for a grocery supermarket. Classify the customer's problem and propose a resolution.

Follow this Chain of Thought reasoning:
1. Identify what item is missing or damaged in the order.
2. Read the available products catalog inside <catalog_context>.
3. Find the closest matching product by category and price.
4. Output the final response matching the JSON schema.

Return ONLY a JSON block:
{
  "reasoningSteps": ["Step 1 description", "Step 2 description", ...],
  "classification": "LACK_OF_STOCK" | "REPLACEMENT" | "DELIVERY_DELAY" | "GENERAL_ERROR",
  "proposedAction": {
    "missingProductId": "ID",
    "suggestedReplacementId": "ID",
    "priceDifference": 0.00
  }
}
</instructions>

<order_context>
Order ID: ${order.id}
Items Purchased: ${JSON.stringify(order.items)}
</order_context>

<catalog_context>
${JSON.stringify(availableProducts)}
</catalog_context>

<user_message>
${userMessage}
</user_message>
```
