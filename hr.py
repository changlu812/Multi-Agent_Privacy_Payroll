
import os
import json
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENROUTER_API_KEY"),
)

# 1. Define the actual function
def get_salary_info(employee_name):
    """Get salary information for a given employee."""
    # Mock data for demonstration
    salaries = {
        "Alice": "120000",
        "Bob": "95000",
        "Charlie": "105000"
    }
    salary = salaries.get(employee_name)
    if salary:
        return json.dumps({"name": employee_name, "salary": salary, "currency": "USD"})
    else:
        return json.dumps({"name": employee_name, "error": "Employee not found"})

# 2. Define the tool schema for the API
tools = [
  {
      "type": "function",
      "function": {
          "name": "get_salary_info",
          "description": "Get salary information for a specific employee",
          "parameters": {
              "type": "object",
              "properties": {
                  "employee_name": {
                      "type": "string",
                      "description": "The name of the employee",
                  },
              },
              "required": ["employee_name"],
          },
      },
  }
]

# 3. Initial user message
messages = [
    {
        "role": "user",
        "content": "Can you check how much Alice earns?"
    }
]

print(f"User Question: {messages[0]['content']}")

# 4. First API Call: Send query and tool definitions
response = client.chat.completions.create(
    model="google/gemini-2.0-flash-001", # Switching to a model known to support tools well, or keep user's choice if preferred
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

response_message = response.choices[0].message
tool_calls = response_message.tool_calls

if tool_calls:
    # 5. Process tool calls
    print(f"\nModel requested tool call(s):")
    available_functions = {
        "get_salary_info": get_salary_info,
    }
    
    messages.append(response_message)  # extend conversation with assistant's reply

    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_to_call = available_functions[function_name]
        function_args = json.loads(tool_call.function.arguments)
        
        print(f"  Function: {function_name}")
        print(f"  Args: {function_args}")
        
        function_response = function_to_call(
            employee_name=function_args.get("employee_name")
        )
        
        print(f"  Output: {function_response}")

        messages.append(
            {
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": function_response,
            }
        )
    
    # 6. Second API Call: Get final natural language response
    second_response = client.chat.completions.create(
        model="google/gemini-2.0-flash-001",
        messages=messages,
    )
    print(f"\nFinal Answer: {second_response.choices[0].message.content}")

else:
    print(f"Model didn't call any tools. Response: {response_message.content}")
