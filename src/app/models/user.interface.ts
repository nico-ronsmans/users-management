export interface DataSources {
  documents: string[];
  databases: string[];
  emails: string[];
  chats: string[];
}

export interface IUser {
  id: number;
  name: string;
  pii: Record<number, string[]>;
  dataSources: DataSources;
  _dataSourcesCount?: number;
}
