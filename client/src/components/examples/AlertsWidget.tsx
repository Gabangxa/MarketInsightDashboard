import AlertsWidget from '../AlertsWidget';

export default function AlertsWidgetExample() {
  return (
    <AlertsWidget
      alerts={[
        {
          id: "1",
          type: "price",
          exchanges: ["Binance", "Bybit"],
          condition: ">",
          value: 68000,
          triggered: false,
          triggerCount: 0,
          maxTriggers: null,
        },
        {
          id: "2",
          type: "keyword",
          exchanges: ["Binance"],
          keyword: "breakout",
          triggered: true,
          lastTriggered: new Date(Date.now() - 5 * 60 * 1000),
          triggerCount: 3,
          maxTriggers: 5,
        }
      ]}
      onAddAlert={() => console.log('Add alert clicked')}
      onDeleteAlert={(id) => console.log('Delete alert:', id)}
    />
  );
}
