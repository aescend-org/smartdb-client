import type { ISmartDBClient } from "./types/client.types";
import type { RawDocument, User } from "./types/api.types";

export class Document {
  private _data: RawDocument;
  private _client?: ISmartDBClient;
  constructor(data: RawDocument) {
    this._data = data;
  }

  static from(data: RawDocument, client: ISmartDBClient): Document {
    const doc = new Document(data);
    doc._client = client;
    return doc;
  }

  get(key: string): any {
    return (this._data as any)[key];
  }
  get raw(): RawDocument {
    return this._data;
  }
  get id(): RawDocument["id"] {
    return this._data.id;
  }
  get title(): RawDocument["title"] {
    return this._data.title;
  }
  get source(): RawDocument["source"] {
    return this._data.source;
  }
  get topics(): RawDocument["topics"] {
    return this._data.topics;
  }
  get doi(): RawDocument["doi"] {
    return this._data.doi;
  }
  get authors(): RawDocument["authors"] {
    return this._data.authors;
  }
  get ownername(): User["username"] | undefined {
    return this._data.owner || undefined;
  }
  get isPublic(): RawDocument["public"] {
    return this._data.public;
  }
  get url(): RawDocument["url"] {
    return this._data.url;
  }

  getOwner(): Promise<User | null> {
    if (!this._client) {
      throw new Error("Client not set");
    }
    if (!this.ownername) {
      return Promise.resolve(null);
    }
    return this._client.getUserByUsername(this.ownername);
  }
}
