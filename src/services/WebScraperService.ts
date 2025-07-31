import FirecrawlApp from '@mendable/firecrawl-js';

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

interface PerplexityResponse {
  success: boolean;
  content?: string;
  error?: string;
}

interface ExtractionResult {
  success: boolean;
  techniques?: any[];
  scenarios?: any[];
  rawContent?: string;
  error?: string;
  sourceUrl?: string;
}

export class WebScraperService {
  private static FIRECRAWL_API_KEY_STORAGE = 'firecrawl_api_key';
  private static PERPLEXITY_API_KEY_STORAGE = 'perplexity_api_key';
  private static firecrawlApp: FirecrawlApp | null = null;

  // Firecrawl Methods
  static saveFirecrawlApiKey(apiKey: string): void {
    localStorage.setItem(this.FIRECRAWL_API_KEY_STORAGE, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
    console.log('Firecrawl API key saved successfully');
  }

  static getFirecrawlApiKey(): string | null {
    return localStorage.getItem(this.FIRECRAWL_API_KEY_STORAGE);
  }

  static savePerplexityApiKey(apiKey: string): void {
    localStorage.setItem(this.PERPLEXITY_API_KEY_STORAGE, apiKey);
    console.log('Perplexity API key saved successfully');
  }

  static getPerplexityApiKey(): string | null {
    return localStorage.getItem(this.PERPLEXITY_API_KEY_STORAGE);
  }

  static async testFirecrawlKey(apiKey: string): Promise<boolean> {
    try {
      console.log('Testing Firecrawl API key');
      this.firecrawlApp = new FirecrawlApp({ apiKey });
      const testResponse = await this.firecrawlApp.crawlUrl('https://example.com', {
        limit: 1
      });
      return testResponse.success;
    } catch (error) {
      console.error('Error testing Firecrawl API key:', error);
      return false;
    }
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; error?: string; data?: any }> {
    const apiKey = this.getFirecrawlApiKey();
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not found' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      const crawlResponse = await this.firecrawlApp.crawlUrl(url, {
        limit: 50,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        }
      }) as CrawlResponse;

      if (!crawlResponse.success) {
        return { 
          success: false, 
          error: (crawlResponse as ErrorResponse).error || 'Failed to crawl website' 
        };
      }

      return { 
        success: true,
        data: crawlResponse 
      };
    } catch (error) {
      console.error('Error during crawl:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Firecrawl API' 
      };
    }
  }

  static async queryPerplexity(query: string): Promise<PerplexityResponse> {
    const apiKey = this.getPerplexityApiKey();
    if (!apiKey) {
      return { success: false, error: 'Perplexity API key not found' };
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity expert. Provide comprehensive, accurate information about cybersecurity techniques and tools.'
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 2000,
          return_images: false,
          return_related_questions: false,
          search_recency_filter: 'month',
          frequency_penalty: 1,
          presence_penalty: 0
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      return {
        success: true,
        content
      };
    } catch (error) {
      console.error('Error querying Perplexity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query Perplexity API'
      };
    }
  }

  static async extractTechniquesFromContent(
    content: string, 
    sourceUrl: string,
    usePerplexityValidation: boolean = false,
    customTemplate?: string
  ): Promise<ExtractionResult> {
    try {
      // Use custom template if provided, otherwise use default
      const template = customTemplate || this.getDefaultExtractionTemplate();
      const extractionPrompt = template.replace('{sourceUrl}', sourceUrl).replace('{content}', content);

      // Use Perplexity for validation if enabled
      if (usePerplexityValidation) {
        const perplexityResult = await this.queryPerplexity(extractionPrompt);
        if (perplexityResult.success && perplexityResult.content) {
          return {
            success: true,
            rawContent: perplexityResult.content,
            sourceUrl
          };
        }
      }

      // For now, return the extraction prompt for manual LLM processing
      // In a real implementation, you would call your LLM service here
      return {
        success: true,
        rawContent: extractionPrompt,
        sourceUrl
      };

    } catch (error) {
      console.error('Error extracting techniques:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract techniques'
      };
    }
  }

  static async bulkProcessUrls(
    urls: string[],
    usePerplexityValidation: boolean = false,
    onProgress?: (progress: { completed: number; total: number; currentUrl: string }) => void
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    const total = urls.length;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      onProgress?.({ completed: i, total, currentUrl: url });

      try {
        // First crawl the website
        const crawlResult = await this.crawlWebsite(url);
        if (!crawlResult.success) {
          results.push({
            success: false,
            error: crawlResult.error,
            sourceUrl: url
          });
          continue;
        }

        // Extract content from crawl result
        const content = crawlResult.data?.data?.[0]?.markdown || crawlResult.data?.data?.[0]?.content || '';
        if (!content) {
          results.push({
            success: false,
            error: 'No content found in crawled data',
            sourceUrl: url
          });
          continue;
        }

        // Extract techniques from content
        const extractionResult = await this.extractTechniquesFromContent(
          content,
          url,
          usePerplexityValidation
        );
        results.push(extractionResult);

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          sourceUrl: url
        });
      }
    }

    onProgress?.({ completed: total, total, currentUrl: '' });
    return results;
  }

  static getDefaultExtractionTemplate(): string {
    return `You are a cybersecurity expert tasked with extracting attack techniques from web content and converting them into structured JSON format for a security dashboard.

**EXTRACTION GUIDELINES:**
1. Only extract content that clearly describes cybersecurity attack techniques, tools, or procedures
2. Never invent or hallucinate information - only use what's explicitly stated
3. For missing information, use "TODO" placeholder
4. Keep all code snippets and commands exactly as written in the source
5. Extract reference links from the source content

**CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON.**

**OUTPUT FORMAT:**
Return a JSON array of technique objects. Each technique object must have this exact structure:

\`\`\`json
{
  "techniques": [
    {
      "title": "Exact technique name from source",
      "mitreId": "T####.### if mentioned, otherwise TODO",
      "phase": "One of: Reconnaissance, Enumeration, Initial Access, Privilege Escalation, Persistence, Credential Access, Lateral Movement, Collection, Command and Control",
      "description": "1-2 sentence description from source",
      "whenToUse": "Conditions/scenarios when technique applies",
      "howToUse": "Step-by-step instructions formatted as **Step 1:**, **Step 2:**, etc. (without numbering like 1. 2. 3.)",
      "tools": [
        "Tool Name"
      ],
      "commands": [
        {
          "tool": "Tool Name",
          "command": "full command with <parameter> placeholders",
          "description": "Command description and purpose"
        }
      ],
      "referenceLinks": [
        {
          "title": "Link Title",
          "url": "URL",
          "description": "Description"
        }
      ],
      "detection": "Blue team detection methods if mentioned",
      "mitigation": "Defense/prevention methods if mentioned",
      "tags": ["tag1", "tag2"],
      "category": "General"
    }
  ],
  "scenarios": [
    {
      "title": "Scenario Title",
      "description": "Brief summary",
      "tags": ["tag1", "tag2"],
      "linkedTechniques": ["Technique names or IDs"]
    }
  ]
}
\`\`\`

**COMMAND TEMPLATE GUIDELINES:**
- Use <parameter> syntax for placeholders (e.g., <target>, <username>, <password>)
- Include full command syntax with all necessary flags
- Each command should be ready-to-use after parameter substitution

**VALIDATION REQUIREMENTS:**
- Response must be valid JSON only
- All string fields must be properly escaped
- Arrays must contain valid elements
- Do not include any text before or after the JSON

Source URL: {sourceUrl}

Now analyze the following content and extract cybersecurity techniques as JSON:

{content}`;
  }

  static calculateQualityScore(extractedContent: string): {
    score: number;
    details: {
      hasRequiredFields: boolean;
      hasCommandTemplates: boolean;
      hasReferenceLinks: boolean;
      hasMitreId: boolean;
      hasDetectionInfo: boolean;
    };
  } {
    const details = {
      hasRequiredFields: extractedContent.includes('**Name:**') && extractedContent.includes('**Description:**'),
      hasCommandTemplates: extractedContent.includes('### Command Templates'),
      hasReferenceLinks: extractedContent.includes('### Reference Links'),
      hasMitreId: /\*\*MITRE ID:\*\* T\d+/.test(extractedContent),
      hasDetectionInfo: extractedContent.includes('**Detection:**')
    };

    const score = Object.values(details).filter(Boolean).length / Object.keys(details).length * 100;

    return { score, details };
  }
}