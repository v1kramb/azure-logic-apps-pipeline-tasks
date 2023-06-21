export interface RetryOptions {
    timeoutBetweenRetries: number,
    numberOfRetries: number
}

export class RetryHelper {
    private retryOptions: RetryOptions;

    constructor(retryOptions: RetryOptions) {
        this.retryOptions = retryOptions;
    }

    public async RunWithRetry<T>(action: () => T, actionName: string): Promise<T> {
        let attempts = this.retryOptions.numberOfRetries;
        while (true) {
            try {
                const result: T = await action();
                return result;
            } catch (err) {
                --attempts;
                if (attempts <= 0) {
                    throw err;
                }
                console.log(`Error while ${actionName}: ${err}. Remaining attempts: ${attempts}`);
                await this.sleep();
            }
        }
    }

    private async sleep() {
        return new Promise(resolve => setTimeout(resolve,
            this.retryOptions.timeoutBetweenRetries));
    }
}