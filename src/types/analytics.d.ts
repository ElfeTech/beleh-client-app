/** Google Analytics / Google Tag Manager globals */
interface DataLayerObject {
  event?: string;
  [key: string]: unknown;
}

type GtagCommand = 'config' | 'event' | 'js' | 'set' | 'consent';

interface Window {
  dataLayer: Array<DataLayerObject | IArguments | unknown[]>;
  gtag?: (
    command: GtagCommand,
    targetOrAction: string | Date,
    params?: Record<string, unknown>,
  ) => void;
}
