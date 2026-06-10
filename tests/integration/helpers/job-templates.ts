export const getDefaultJobTemplateId = async (baseUrl: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/api/v1/job-templates`);

  if (!response.ok) {
    throw new Error(`Failed to load job templates: ${response.status}`);
  }

  const templates = (await response.json()) as Array<{
    id: string;
    isDefault: boolean;
  }>;
  const template = templates.find((item) => item.isDefault) ?? templates[0];

  if (!template) {
    throw new Error('No job templates found');
  }

  return template.id;
};
