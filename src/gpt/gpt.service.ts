require('dotenv').config();

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
  model = 'gpt-3.5-turbo';
  endpoint = 'https://training.nerdbord.io/api/v1/openai/chat/completions';
  apiKey = process.env['OPENAI_API_KEY'] || null;
  basicContext =
    "You're user's good friend, he's trying to get rid of his addictions (drinking, smoking etc.), your goal is to help him to keep in control his addiction, and finally to reduce it to a minimum.";
  // Funkcje służą do ekstrakcji z prompta usera danych by zwrócić JSON argumentów które funkcja mogłaby przyjąć w parametrach. (nie musi zwracać wszystkiego bo zależy co poda user)
  gptFunctions: { [key: string]: gptFunction } = {
    createCathegory: {
      description: 'Function to create a cathegory',
      name: 'createCathegory',
      parameters: {
        type: 'string',
        name: 'cathegoryName',
      },
    },
    // TODO: FINISH THIS
    getTimePeriod: {
      description: 'Function to create a cathegory',
      name: 'createCathegory',
      parameters: {
        type: 'string',
        name: 'cathegoryName',
      },
    },
    welcomeUser: {
      description: 'Function to welcome user',
      name: 'welcomeUser',
      parameters: {
        type: 'string',
        name: 'name',
      },
    },
    commentBudget: {
      description: 'Function to comment user monthly budget for alcohol',
      name: 'commentBudget',
      parameters: {
        type: 'string',
        name: 'message',
      },
    },
  };
  constructor() {}

  // nie jestem pewien czy to jest wgl potrzebne.
  async welcomeUser(name: string, language: string, monthlyBudget: number) {
    const prompt = `Hi!, My name is ${name}`;
    return await this.complete({
      systemMessage: `${this.basicContext}. User's going to provide you his name, and you should greet him using his name. Greeting should be different every time and should have at least 30 words. Please provide response in language: ${language}. And ask user about his monthly budget for alcohol, user must write back number `,
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

  // Funkcja ma za zadanie skomentować trend zmian wydatków użytkownika w określonym czasie (z dnia na dzień, z tygodnia na tydzień)
  // TODO: timeBasis enum
  async commentTrend(
    trend: number,
    language: string,
    timeBasis: 'day' | 'week' | 'month'
  ) {
    const systemMessage = `${this.basicContext} Rate, comment this trend of his spending on addiction: ${trend} (it's a ${timeBasis} to ${timeBasis} trend).  If it's negative please encourage him to do better, if it's positive praise him, give him more tips, and ask him why does he thinks so he's improved. Please provide response in language: ${language}`;
    // Coś w ten deseń.
    const userMessage = `Hey, this is my last trend ${trend}, what do you think about it?`;

    return await this.complete({ systemMessage, userMessage });
  }

  // Funkcja ma za zadanie sporządzić podsumowanie wydatków, trendów wydatków na używki użytkownika.
  // todo: ogarnąć okres. + Ogarnąć funkcję używającą tool'ów by ogarnąć dane od użytkownika od kiedy do kiedy chce podsumować.
  // spendingData = JSON?
  async periodicalSummary(
    spendingData: string,
    language: string,
    period: 'od 9 września 2022 do 13 września 2023'
  ) {
    const systemMessage = `${this.basicContext} Provide summary of his spending on addiction over the period: ${period}, you could distunguish trends during smaller periods, and comment on them, aswell as decide if overally he's going in the good direction. Please provide response in language: ${language}`;
    const userMessage = `Hey, i'll give you data of my spending during this period ${period}. The data: ${spendingData}. What do you think about it?`;
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

  // przykładowa funkcja która będzie używana do tworzenia kategorii.
  async createCathegory(name: string) {
    const prompt = `create a cathegory named ${name}`;
    return await this.complete({
      systemMessage: "You're a helpful assistant",
      userMessage: prompt,
    });
  }

  // feel free to extend to arrays if needed (passing whole convo)
  async complete({
    systemMessage,
    userMessage,
  }: {
    systemMessage: string;
    userMessage: string;
  }) {
    const response = await this.callTemplate([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
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
    const messages = [{ role: 'user', content: userMessage }];
    if (systemMessage) {
      messages.unshift({ role: 'system', content: systemMessage });
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
  ): Promise<openAiResponse> {
    if (!this.apiKey) {
      throw new Error('API key is not defined');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error('Response is null');
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error('Data is null');
    }
    return data as openAiResponse;
  }

  createTool(gptFunction: gptFunction): gptTool {
    return { type: 'function', function: gptFunction };
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
  type: 'function';
  function: gptFunction;
};
