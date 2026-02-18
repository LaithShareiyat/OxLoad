import { CanvasCourse, CanvasAssignment, CanvasTodoItem } from "./types";

export class CanvasApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CanvasApiError";
  }
}

export class CanvasClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };
  }

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;

    const links = linkHeader.split(",");
    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) return match[1];
    }
    return null;
  }

  private async handleRateLimit(response: Response): Promise<void> {
    const remaining = response.headers.get("X-Rate-Limit-Remaining");
    const retryAfter = response.headers.get("Retry-After");

    if (retryAfter) {
      const waitMs = parseFloat(retryAfter) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return;
    }

    if (remaining !== null && parseFloat(remaining) < 10) {
      // Back off proactively when running low on quota
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    // Default backoff for 429
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private async fetchWithRetry(
    url: string,
    maxRetries = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, { headers: this.headers });

        if (response.status === 401 || response.status === 403) {
          throw new CanvasApiError(
            "Invalid or expired Canvas API token. Please update it in Settings.",
            response.status
          );
        }

        if (response.status === 429) {
          await this.handleRateLimit(response);
          continue;
        }

        if (!response.ok) {
          throw new CanvasApiError(
            `Canvas API error: ${response.status} ${response.statusText}`,
            response.status
          );
        }

        // Proactive rate limit check
        const remaining = response.headers.get("X-Rate-Limit-Remaining");
        if (remaining !== null && parseFloat(remaining) < 20) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        return response;
      } catch (error) {
        if (error instanceof CanvasApiError && error.status < 500) {
          throw error; // Don't retry client errors
        }
        lastError = error as Error;
        // Exponential backoff for server errors
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError || new Error("Canvas API request failed after retries");
  }

  async fetchAllPages<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let url: string | null = `${this.baseUrl}/api/v1${path}`;

    while (url) {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      results.push(...data);
      url = this.parseNextLink(response.headers.get("Link"));
    }

    return results;
  }

  async getCourses(): Promise<CanvasCourse[]> {
    return this.fetchAllPages<CanvasCourse>(
      "/courses?enrollment_state=active&include[]=term&include[]=teachers&include[]=total_scores&per_page=50"
    );
  }

  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    return this.fetchAllPages<CanvasAssignment>(
      `/courses/${courseId}/assignments?include[]=submission&order_by=due_at&per_page=50`
    );
  }

  async getTodoItems(): Promise<CanvasTodoItem[]> {
    return this.fetchAllPages<CanvasTodoItem>("/users/self/todo?per_page=50");
  }

  async testConnection(): Promise<{ success: boolean; userName?: string; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/v1/users/self`
      );
      const user = await response.json();
      return { success: true, userName: user.name };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }
}
