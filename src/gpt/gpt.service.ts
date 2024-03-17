require("dotenv").config();
import { CreateUserPayload } from "../types/user.types";

// only relevant info is included here
type openAiResponse = {
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
  }[];
};

export default class GptClient {
  model = "gpt-3.5-turbo";
  endpoint = "https://training.nerdbord.io/api/v1/openai/chat/completions";
  apiKey = process.env["OPENAI_API_KEY"] || null;
  userDataContext: CreateUserPayload = {
    chatId: BigInt(0),
    first_name: "",
    last_name: "",
    language_code: "",
  };
  basicContext = `You're user's good friend, he's trying to get rid of his addictions (drinking, smoking etc.), your goal is to help him to keep in control his addiction, and finally to reduce it to a minimum. If user exists you will recieve context data about him from database: ${this.userDataContext}`;
  // Funkcje służą do ekstrakcji z prompta usera danych by zwrócić JSON argumentów które funkcja mogłaby przyjąć w parametrach. (nie musi zwracać wszystkiego bo zależy co poda user)
  gptFunctions: { [key: string]: gptFunction } = {
    getTimePeriod: {
      description: "Function to get time period from user, response should be in a range of date format",
      name: "getTimePeriod",
      parameters: {
        type: "object",
        properties: {
          startingDate: {
            type: "object",
            description: "beginning date of time period",
            properties: {
              year: {
                type: "number",
                description: "year of time period",
              },
              month: {
                type: "number",
                description: "month of time period",
              },
              day: {
                type: "number",
                description: "day of time period",
              },
            },
          },
          finishDate: {
            type: "object",
            description: "end date of time period",
            properties: {
              year: {
                type: "number",
                description: "year of time period",
              },
              month: {
                type: "number",
                description: "month of time period",
              },
              day: {
                type: "number",
                description: "day of time period",
              },
            },
          },
        },
        required: ["startingDate", "finishDate"],
      },
    },
    updateMonthlyBudget: {
      description: "Function to get from message user monthly budget for alcohol, so it can be stored in database. ",
      name: "updateMonthlyBudget",
      parameters: {
        type: "object",
        properties: {
          budget: {
            type: "number",
            description: "monthly budget for addiction",
          },
        },
        required: ["budget"],
      },
    },
    updateSpendings: {
      description:
        "Function is used to update daily spendings for addiction, based on his today spendings. It should be considered as a spending. If user's providing you info about his spending or that hi recently bought something you should use this.",
      name: "updateSpendings",
      parameters: {
        type: "object",
        properties: {
          spending: {
            type: "number",
            description: "todays spending on addiction to detract from monthly budget",
          },
        },
        required: ["spending"],
      },
    },
    getRemaingBudget: {
      description: "provide user the value of remeaning budget",
      name: "getRemaingBudget",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "monthly budget for addiction",
          },
          language: {
            type: "string",
            description: "language name",
          },
          remainingBudget: {
            type: "number",
            description: "value of budget left ",
          },
        },
        required: ["budget"],
      },
    },
  };
  constructor() {}

  async welcomeUser(name: string, language: string, monthlyBudget: number) {
    const prompt = `Hi!, My name is ${name}`;
    return await this.complete({
      systemMessage: `${this.basicContext}. You should greet user using his name. Greeting should be different every time and should have at least 30 words. Please provide response in language: ${language}. Ask user if he had any spendings on alcohol.`,
      userMessage: prompt,
    });
  }

  async welcomeNewUser(name: string, language: string, monthlyBudget: number) {
    const prompt = `Hi!, My name is ${name}`;
    return await this.complete({
      systemMessage: `${this.basicContext}. , and you should greet him using his name. Greeting should be different every time and should have at least 30 words. Please provide response in language: ${language}. And ask user about his monthly budget for alcohol, user must write back number `,
      userMessage: prompt,
    });
  }

  async commentBudget(message: string, language: string) {
    const prompt = `Sure, my monthly budget for alcohol is: ${message}`;
    return await this.complete({
      systemMessage: `${this.basicContext}. Please provide response in this language code: ${language}. User is going to provide you his monthly budget for alcohol. You should comment it. If it is more then 500 you should tell him gently that it is too much. otherwise it is always more than he think it is ok. If there is no number i user message then you should ask him again to provide it.`,
      userMessage: prompt,
    });
  }

  async confirmAddedSpending(message: string, language: string) {
    const prompt = `hey, i just spent: ${message} on alcohol. please save this information`;
    return await this.complete({
      systemMessage: `${this.basicContext}. Please provide response in this language code: ${language}. User is going to provide you his latest spending for alcohol. Inform user that this information has been stored. Do not ask him any questions. If there is no number i user message then you should ask him again to provide it.`,
      userMessage: prompt,
    });
  }

  async commentRemaingBudget(budget: number, language: string) {
    const prompt = `hey, just want you provide me remaining value of my budget, in this language: ${language}`;
    return await this.complete({
      systemMessage: `${this.basicContext}. Please provide response in this language code: ${language}. this is user budget  ${budget},provide it to the user . dont ask any questions`,
      userMessage: prompt,
    });
  }

  // Funkcja ma za zadanie skomentować trend zmian wydatków użytkownika w określonym czasie (z dnia na dzień, z tygodnia na tydzień)
  // TODO: timeBasis enum
  async commentTrend(trend: number, language: string, timeBasis: "day" | "week" | "month") {
    const systemMessage = `${this.basicContext} Rate, comment this trend of his spending on addiction: ${trend} (it's a ${timeBasis} to ${timeBasis} trend).  If it's negative please encourage him to do better, if it's positive praise him, give him more tips, and ask him why does he thinks so he's improved. Please provide response in language: ${language}`;
    // Coś w ten deseń.
    const userMessage = `Hey, this is my last trend ${trend}, what do you think about it?`;

    return await this.complete({ systemMessage, userMessage });
  }

  // Funkcja ma za zadanie sporządzić podsumowanie wydatków, trendów wydatków na używki użytkownika.
  // spendingData = JSON?
  async periodicalSummary(
    spendingData: string,
    language: string,
    periodMessage: "od 9 września 2022 do 13 września 2023"
  ) {
    const systemMessage = `${this.basicContext} Provide summary of his spending on addiction over the period: ${periodMessage}, you could distunguish trends during smaller periods, and comment on them, aswell as decide if overally he's going in the good direction. Please provide response in language: ${language}`;
    const userMessage = `Hey, i'll give you data of my spending during this period ${periodMessage}. The data: ${spendingData}. What do you think about it?`;
    return await this.complete({ systemMessage, userMessage });
  }

  async getPeriodicalSummary(message: string) {
    const systemDescription = `User is going to provide you a time period.`;
    const tool = this.gptFunctions.getTimePeriod;
    return await this.completeWithTools({
      userMessage: message,
      functions: [tool],
    });
  }

  // async getRemaingBudget(
  //   message: string,
  //   language: string,
  //   remainingBudget: number
  // ) {
  //   const systemMessage = `${this.basicContext} Provide user reamaining value of his bugdet - ${remainingBudget}for the rest of current month. Please provide response in language: ${language}`;
  //   const userMessage = "Hey, tell how much budget i have left for this month";
  //   return await this.complete({ systemMessage, userMessage });
  // }

  async provideFunctionality(userMessage: string) {
    return this.completeWithTools({
      systemMessage: `${this.basicContext} Your main goal right now is to decide which functionalities should be used with user message.`,
      userMessage,
      functions: [...Object.values(this.gptFunctions)],
    });
  }

  // feel free to extend to arrays if needed (passing whole convo)
  async complete({ systemMessage, userMessage }: { systemMessage: string; userMessage: string }) {
    const response = await this.callTemplate([
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ]);
    return response;
  }

  async completeWithTools({
    systemMessage,
    userMessage,
    functions,
  }: {
    systemMessage?: string;
    userMessage: string;
    functions: gptFunction[];
  }) {
    const messages = [{ role: "user", content: userMessage }];
    if (systemMessage) {
      messages.unshift({ role: "system", content: systemMessage });
    }
    const response = await this.callTemplate(
      messages,
      functions.map((func) => this.createTool(func))
    );
    return response;
  }

  // temperature 0 to 2, 0 = specific 2 = random === creativity (to tweak in individual method)
  async callTemplate(
    messages: { role: string; content: string }[],
    tools?: gptTool[],
    temperature?: number
  ): Promise<string | { name: string; arguments: string }> {
    if (!this.apiKey) {
      throw new Error("API key is not defined");
    }
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${this.apiKey}`,
      },
      body: JSON.stringify({
        messages,
        tools,
        n: 1,
        // tool_choice: "auto",
      }),
    });

    if (!response) {
      throw new Error("Response is null");
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data) {
      throw new Error("Data is null");
    }
    if (tools) {
      try {
        return data.choices[0].message.tool_calls[0].function as {
          name: string;
          arguments: string;
        };
      } catch (e) {
        return data.choices[0].message?.content;
      }
    } else {
      return data.choices[0].message?.content;
    }
  }

  createTool(gptFunction: gptFunction): gptTool {
    return { type: "function", function: gptFunction };
  }
}

type gptFunction = {
  description: string;
  name: string;
  parameters: {
    type: string;
    properties: {
      [key: string]: {
        type: any;
        description: string;
        properties?: {
          [key: string]: {
            type: any;
            description: string;
          };
        };
      };
    };
    required?: string[];
  };
};

type gptTool = {
  type: "function";
  function: gptFunction;
};
