import { supabase } from '@/integrations/supabase/client';

export interface ExtractionTemplate {
  id: string;
  template_content: string;
  is_active: boolean;
  version_number: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  description: string | null;
  name: string;
}

export class TemplateManagementService {
  /**
   * Get the currently active template
   */
  static async getActiveTemplate(): Promise<ExtractionTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('llm_extraction_templates')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching active template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching active template:', error);
      return null;
    }
  }

  /**
   * Get all template versions with history
   */
  static async getTemplateHistory(): Promise<ExtractionTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('llm_extraction_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching template history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching template history:', error);
      return [];
    }
  }

  /**
   * Save a new template and set it as active
   */
  static async saveNewTemplate(
    templateContent: string,
    name: string,
    description?: string
  ): Promise<{ success: boolean; error?: string; template?: ExtractionTemplate }> {
    try {
      // Get current max version number
      const { data: maxVersionData } = await supabase
        .from('llm_extraction_templates')
        .select('version_number')
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (maxVersionData?.[0]?.version_number || 0) + 1;

      // Deactivate all existing templates
      await supabase
        .from('llm_extraction_templates')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new template as active
      const { data, error } = await supabase
        .from('llm_extraction_templates')
        .insert({
          template_content: templateContent,
          is_active: true,
          version_number: nextVersion,
          name: name,
          description: description
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving new template:', error);
        return { success: false, error: error.message };
      }

      return { success: true, template: data };
    } catch (error) {
      console.error('Error saving new template:', error);
      return { success: false, error: 'Failed to save template' };
    }
  }

  /**
   * Activate an existing template version
   */
  static async activateTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Deactivate all templates
      await supabase
        .from('llm_extraction_templates')
        .update({ is_active: false })
        .eq('is_active', true);

      // Activate the selected template
      const { error } = await supabase
        .from('llm_extraction_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) {
        console.error('Error activating template:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error activating template:', error);
      return { success: false, error: 'Failed to activate template' };
    }
  }

  /**
   * Delete a template (only if not active)
   */
  static async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if template is active
      const { data: template } = await supabase
        .from('llm_extraction_templates')
        .select('is_active')
        .eq('id', templateId)
        .single();

      if (template?.is_active) {
        return { success: false, error: 'Cannot delete active template' };
      }

      const { error } = await supabase
        .from('llm_extraction_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: 'Failed to delete template' };
    }
  }

  /**
   * Get the default template content (for backwards compatibility)
   */
  static async getDefaultTemplateContent(): Promise<string> {
    const activeTemplate = await this.getActiveTemplate();
    
    if (activeTemplate) {
      return activeTemplate.template_content;
    }

    // Fallback to hardcoded default if no active template found
    return this.getHardcodedDefaultTemplate();
  }

  /**
   * Hardcoded default template (fallback)
   */
  private static getHardcodedDefaultTemplate(): string {
    return `You are a cybersecurity expert assistant specialized in extracting and structuring cybersecurity techniques from web content. Your task is to analyze the provided content and extract relevant cybersecurity techniques in a structured JSON format.

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
Return ONLY a valid JSON object with a "techniques" property containing an array of extracted techniques:

\`\`\`json
{
  "techniques": [
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "phase": "string",
      "mitreId": "string or null",
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
      "when_to_use": ["string"],
      "how_to_use": ["string"],
      "tools": ["string"],
      "reference_links": [
        {
          "title": "string",
          "url": "string"
        }
      ],
      "tags": ["string"]
    }
  ]
}
\`\`\`

## Important Guidelines:
- Extract only cybersecurity-related techniques
- Ensure all JSON is valid and properly formatted
- Include as much detail as possible for each field
- If information is not available, use appropriate defaults (empty arrays, null values)
- Focus on actionable, practical information
- Maintain accuracy and avoid speculation
- Use camelCase for field names (mitreId, not mitre_id)
- Ensure arrays are properly formatted from the start

Now analyze the following content and extract cybersecurity techniques:`;
  }
}