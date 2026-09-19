import { Card } from "./Card";

type FeatureStubProps = {
  title: string;
  detail?: string;
};

/**
 * Purpose: Placeholder panel other agents can import before a real screen exists.
 * Inputs: `title` and optional `detail` copy.
 * Returns: A shared Card using the design-system classes, not inline colours.
 * Does not: Fetch jobs, route, or call the API.
 */
export function FeatureStub({ title, detail }: FeatureStubProps) {
  return (
    <Card kicker="Not built yet" title={title}>
      {detail ? <p className="page__copy">{detail}</p> : null}
    </Card>
  );
}
