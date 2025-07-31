import { supabase } from "@/integrations/supabase/client";
import { sampleMarkdownTechniques, parseMultipleMarkdownTechniques } from "./markdownParser";

export interface DatabaseTechnique {
  id?: string;
  title: string;
  description: string;
  phase: string;
  tags: string[];
  tools: string[];
  category: string;
  when_to_use: string[];
  how_to_use: string[];
  commands: any[];
  detection: string[];
  mitigation: string[];
  reference_links: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  is_active?: boolean;
}

export async function migrateTechniquesToDatabase(): Promise<boolean> {
  try {
    console.log('Starting technique migration to database...');
    
    // Check if techniques already exist
    const { data: existingTechniques, error: checkError } = await supabase
      .from('techniques')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing techniques:', checkError);
      return false;
    }
    
    if (existingTechniques && existingTechniques.length > 0) {
      console.log('Techniques already exist in database, skipping migration');
      return true;
    }
    
    // Parse all sample techniques
    const parsedTechniques = parseMultipleMarkdownTechniques(sampleMarkdownTechniques);
    
    // Convert to database format
    const dbTechniques: DatabaseTechnique[] = parsedTechniques.map(technique => ({
      title: technique.title,
      description: technique.description,
      phase: technique.phase,
      tags: technique.tags || [],
      tools: technique.tools || [],
      category: technique.category || 'General',
      when_to_use: Array.isArray(technique.whenToUse) ? technique.whenToUse : (technique.whenToUse ? [technique.whenToUse] : []),
      how_to_use: Array.isArray(technique.howToUse) ? technique.howToUse : (technique.howToUse ? [technique.howToUse] : []),
      commands: technique.commands || [],
      detection: Array.isArray(technique.detection) ? technique.detection : (technique.detection ? [technique.detection] : []),
      mitigation: Array.isArray(technique.mitigation) ? technique.mitigation : (technique.mitigation ? [technique.mitigation] : []),
      reference_links: [
        {
          title: "MITRE ATT&CK",
          url: `https://attack.mitre.org/techniques/${technique.id}/`,
          description: "Official MITRE documentation for this technique"
        },
        {
          title: "NIST Cybersecurity Framework",
          url: "https://www.nist.gov/cyberframework",
          description: "NIST guidelines for cybersecurity best practices"
        }
      ],
      is_active: true
    }));
    
    // Insert techniques in batches
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < dbTechniques.length; i += batchSize) {
      const batch = dbTechniques.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('techniques')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting batch:', insertError);
        return false;
      }
      
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${dbTechniques.length} techniques`);
    }
    
    console.log(`Migration completed successfully! Inserted ${insertedCount} techniques.`);
    return true;
    
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

export async function fetchTechniquesFromDatabase() {
  try {
    const { data: techniques, error } = await supabase
      .from('techniques')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching techniques:', error);
      return [];
    }
    
    return techniques || [];
  } catch (error) {
    console.error('Error in fetchTechniquesFromDatabase:', error);
    return [];
  }
}

export async function fetchUserFavorites(userId: string) {
  try {
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('technique_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
    
    return favorites?.map(f => f.technique_id) || [];
  } catch (error) {
    console.error('Error in fetchUserFavorites:', error);
    return [];
  }
}

export async function toggleTechniqueFavorite(userId: string, techniqueId: string, isFavorite: boolean) {
  try {
    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('technique_id', techniqueId);
      
      if (error) {
        console.error('Error removing favorite:', error);
        return false;
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          technique_id: techniqueId
        });
      
      if (error) {
        console.error('Error adding favorite:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in toggleTechniqueFavorite:', error);
    return false;
  }
}