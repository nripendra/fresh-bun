import { useSignal } from "@preact/signals";
import { Button } from "~/components/button";

export default function () {
  const count = useSignal(0);  
  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Counter</h2>
      <p className="text-2xl font-bold mb-4">{count.value}</p>
      <div className="space-x-2">
        <Button onClick={() => count.value--}>Decrease</Button>
        <Button onClick={() => count.value++}>Increase</Button>
      </div>
    </div>
  );
}
