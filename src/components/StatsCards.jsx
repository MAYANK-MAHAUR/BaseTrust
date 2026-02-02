import { Card } from './ui/card'
import { TrendingUp, Activity, CheckCircle2, DollarSign } from 'lucide-react'
import { EscrowState } from '../hooks/useEscrows'

export function StatsCards({ escrows }) {
    if (!escrows) return null

    // Calculate Metrics
    const totalVolume = escrows.reduce((acc, curr) => {
        return acc + parseFloat(curr.amount || 0)
    }, 0)

    const activeDeals = escrows.filter(e =>
        e.state === EscrowState.AWAITING_DELIVERY ||
        e.state === EscrowState.AWAITING_ACCEPTANCE
    ).length

    const completedDeals = escrows.filter(e => e.state === EscrowState.COMPLETED).length
    const totalFinished = escrows.filter(e => e.state === EscrowState.COMPLETED || e.state === EscrowState.REFUNDED || e.state === EscrowState.DISPUTED).length

    const successRate = totalFinished > 0
        ? Math.round((completedDeals / totalFinished) * 100)
        : 100

    const stats = [
        {
            title: "Total Volume",
            value: `$${totalVolume.toLocaleString()}`,
            icon: DollarSign,
            desc: "All time volume",
            color: "text-green-500"
        },
        {
            title: "Active Deals",
            value: activeDeals,
            icon: Activity,
            desc: "Currently in progress",
            color: "text-blue-500"
        },
        {
            title: "Success Rate",
            value: `${successRate}%`,
            icon: CheckCircle2,
            desc: "Completed vs Disputes",
            color: "text-purple-500"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
                <Card key={i} className="p-6 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className={`p-4 rounded-full bg-secondary/30 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                    </div>
                </Card>
            ))}
        </div>
    )
}
