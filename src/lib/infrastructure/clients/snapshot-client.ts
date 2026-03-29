import { TheGraphClient } from './thegraph-client';

export interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  state: string;
  start: number;
  author: string;
  space: {
    id: string;
    name: string;
  };
}

export class SnapshotClient {
  private client: TheGraphClient;

  constructor(endpoint: string = 'https://hub.snapshot.org/graphql') {
    this.client = new TheGraphClient(endpoint);
  }

  async getProposals(space: string, first: number = 20): Promise<SnapshotProposal[]> {
    const query = `
      query GetProposals($space: String!, $first: Int!) {
        proposals(
          first: $first,
          where: { space_in: [$space] },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          state
          start
          author
          space {
            id
            name
          }
        }
      }
    `;

    const data = await this.client.query<{ proposals: SnapshotProposal[] }>(query, {
      space,
      first
    });

    return data.proposals || [];
  }
}

export const snapshotClient = new SnapshotClient();
