-- Create LLM extraction templates table for persistent template management
CREATE TABLE public.llm_extraction_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  name TEXT NOT NULL DEFAULT 'Extraction Template'
);

-- Enable RLS
ALTER TABLE public.llm_extraction_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage extraction templates" 
ON public.llm_extraction_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create policy for viewing templates (everyone can view active template)
CREATE POLICY "Everyone can view active template" 
ON public.llm_extraction_templates 
FOR SELECT 
USING (is_active = true);

-- Create index for active template lookup
CREATE INDEX idx_llm_templates_active ON public.llm_extraction_templates(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE TRIGGER update_llm_extraction_templates_updated_at
BEFORE UPDATE ON public.llm_extraction_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template (from WebScraperService)
INSERT INTO public.llm_extraction_templates (
  template_content,
  is_active,
  version_number,
  name,
  description
) VALUES (
  'You are a cybersecurity expert assistant specialized in extracting and structuring cybersecurity techniques from web content. Your task is to analyze the provided content and extract relevant cybersecurity techniques in a structured JSON format.

## Input Analysis Instructions:
1. Carefully read and analyze the provided web content
2. Identify cybersecurity techniques, tactics, procedures, and tools
3. Extract relevant information including commands, detection methods, and mitigation strategies
4. Structure the information according to the specified JSON format

## Extraction Requirements:
For each technique you identify, extract the following information:
- **Title**: Clear, descriptive name of the technique
- **Description**: Detailed explanation of what the technique does
- **Category**: Classification (e.g., "Reconnaissance", "Initial Access", "Persistence", etc.)
- **Phase**: Attack phase this technique belongs to
- **MITRE ID**: If mentioned, the corresponding MITRE ATT&CK ID
- **Commands**: Specific commands, tools, or code examples
- **Detection**: Methods to detect this technique
- **Mitigation**: Ways to prevent or mitigate this technique
- **Tools**: Related tools and software
- **Reference Links**: Source URLs and additional resources
- **Tags**: Relevant keywords and categories

## Output Format:
Return ONLY a valid JSON array containing the extracted techniques. Each technique should follow this structure:

```json
[
  {
    "title": "string",
    "description": "string",
    "category": "string",
    "phase": "string",
    "mitre_id": "string or null",
    "commands": [
      {
        "description": "string",
        "command": "string",
        "platform": "string",
        "references": ["string"]
      }
    ],
    "detection": ["string"],
    "mitigation": ["string"],
    "tools": ["string"],
    "reference_links": [
      {
        "title": "string",
        "url": "string"
      }
    ],
    "tags": ["string"],
    "when_to_use": ["string"],
    "how_to_use": ["string"]
  }
]
```

## Important Guidelines:
- Extract only cybersecurity-related techniques
- Ensure all JSON is valid and properly formatted
- Include as much detail as possible for each field
- If information is not available, use appropriate defaults (empty arrays, null values)
- Focus on actionable, practical information
- Maintain accuracy and avoid speculation

Now analyze the following content and extract cybersecurity techniques:',
  true,
  1,
  'Default Cybersecurity Extraction Template',
  'Default template for extracting cybersecurity techniques from web content'
);