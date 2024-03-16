require("dotenv").config();

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
  // Funkcje służą do ekstrakcji z prompta usera danych by zwrócić JSON argumentów które funkcja mogłaby przyjąć w parametrach. (nie musi zwracać wszystkiego bo zależy co poda user)
  gptFunctions: { [key: string]: gptFunction } = {
    createCathegory: {
      description: "Function to create a cathegory",
      name: "createCathegory",
      parameters: {
        type: "string",
        name: "cathegoryName",
      },
    },
  };
  constructor() {}

  // przykładowa funkcja która będzie używałana do tworzenia kategorii.
  async createCathegory(name: string) {
    const prompt = `create a cathegory named ${name}`;
    return await this.complete({ systemMessage: "You're a helpful assistant", userMessage: prompt });
  }

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
    systemMessage: string;
    userMessage: string;
    functions: gptFunction[];
  }) {
    const response = await this.callTemplate(
      [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      functions.map((func) => this.createTool(func))
    );
    return response;
  }

  // temperature 0 to 2, 0 = specific 2 = random === creativity
  async callTemplate(
    messages: { role: string; content: string }[],
    tools?: gptTool[],
    temperature?: number
  ): Promise<openAiResponse> {
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
        model: this.model,
        messages,
        tools,
        n: 1,
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
    return data as openAiResponse;
  }

  createTool(gptFunction: gptFunction): gptTool {
    return { type: "function", function: gptFunction };
  }
}

type gptFunction = {
  description: string;
  name: string;
  parameters: {
    [key: string]: string;
  };
};

type gptTool = {
  type: "function";
  function: gptFunction;
};
