import { Card } from "@/components/ui";

export default function Loading() { return <div className="bonus-simulator" aria-busy="true"><Card><div className="skeleton" style={{ height: 32, width: "45%" }} /><div className="skeleton" style={{ height: 16, marginTop: 12, width: "70%" }} /></Card><div className="bonus-summary">{Array.from({ length: 4 }, (_, index) => <Card key={index}><div className="skeleton" style={{ height: 28, width: "42%" }} /><div className="skeleton" style={{ height: 14, marginTop: 12, width: "72%" }} /></Card>)}</div></div>; }
