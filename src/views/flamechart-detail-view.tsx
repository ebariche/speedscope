import {StyleDeclarationValue, css} from 'aphrodite'
import {h, JSX} from 'preact'
import {getFlamechartStyle} from './flamechart-style'
import {formatPercent} from '../lib/utils'
import {Frame, CallTreeNode, ExtraStatistics} from '../lib/profile'
import {ColorChit} from './color-chit'
import {Flamechart} from '../lib/flamechart'
import {useTheme} from './themes/theme'
import {ActiveProfileState, useActiveProfileState} from '../app-state/active-profile-state'

interface StatisticsTableProps {
  title: string
  grandTotal: number
  selectedTotal: number
  selectedSelf: number
  cellStyle: StyleDeclarationValue
  formatter: (v: number) => string
}

function StatisticsTable(props: StatisticsTableProps) {
  const style = getFlamechartStyle(useTheme())

  const total = props.formatter(props.selectedTotal)
  const self = props.formatter(props.selectedSelf)
  const totalPerc = (100.0 * props.selectedTotal) / props.grandTotal
  const selfPerc = (100.0 * props.selectedSelf) / props.grandTotal

  return (
    <div className={css(style.statsTable)}>
      <div className={css(props.cellStyle, style.statsTableCell, style.statsTableHeader)}>
        {props.title}
      </div>

      <div className={css(props.cellStyle, style.statsTableCell)}>Total</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>Self</div>

      <div className={css(props.cellStyle, style.statsTableCell)}>{total}</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{self}</div>

      <div className={css(props.cellStyle, style.statsTableCell)}>
        {formatPercent(totalPerc)}
        <div className={css(style.barDisplay)} style={{height: `${totalPerc}%`}} />
      </div>
      <div className={css(props.cellStyle, style.statsTableCell)}>
        {formatPercent(selfPerc)}
        <div className={css(style.barDisplay)} style={{height: `${selfPerc}%`}} />
      </div>
    </div>
  )
}

interface ExtraStatisticsTableProps {
  cellStyle: StyleDeclarationValue
  formatter: (v: number) => string
  calls: number
  min: number
  max: number
  median: number
  mean: number
  stDev: number
  stErr: number
}

function ExtraStatisticsTable(props: ExtraStatisticsTableProps) {
  const style = getFlamechartStyle(useTheme())

  const min = props.formatter(props.min)
  const max = props.formatter(props.max)
  const median = props.formatter(props.median)
  const mean = props.formatter(props.mean)
  const stDev = props.formatter(props.stDev)
  const stErr = props.formatter(props.stErr)

  return (
    <div className={css(style.statsTable)}>
      <div className={css(props.cellStyle, style.statsTableCell)}>Count</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{props.calls}</div>

      <div className={css(props.cellStyle, style.statsTableCell)}>Min</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{min}</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>Max</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{max}</div>

      <div className={css(props.cellStyle, style.statsTableCell)}>Median</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{median}</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>Mean</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{mean}</div>

      <div className={css(props.cellStyle, style.statsTableCell)}>St.Dev</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{stDev}</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>St.Err</div>
      <div className={css(props.cellStyle, style.statsTableCell)}>{stErr}</div>
    </div>
  )
}

interface StackTraceViewProps {
  getFrameColor: (frame: Frame) => string
  node: CallTreeNode
}
function StackTraceView(props: StackTraceViewProps) {
  const style = getFlamechartStyle(useTheme())

  const rows: JSX.Element[] = []
  let node: CallTreeNode | null = props.node
  for (; node && !node.isRoot(); node = node.parent) {
    const row: (JSX.Element | string)[] = []
    const {frame} = node

    row.push(<ColorChit color={props.getFrameColor(frame)} />)

    if (rows.length) {
      row.push(<span className={css(style.stackFileLine)}>&gt; </span>)
    }
    row.push(frame.name)

    if (frame.file) {
      let pos = frame.file
      if (frame.line != null) {
        pos += `:${frame.line}`
        if (frame.col != null) {
          pos += `:${frame.col}`
        }
      }
      row.push(<span className={css(style.stackFileLine)}> ({pos})</span>)
    }
    rows.push(<div className={css(style.stackLine)}>{row}</div>)
  }
  return (
    <div className={css(style.stackTraceView)}>
      <div className={css(style.stackTraceViewPadding)}>{rows}</div>
    </div>
  )
}

interface FlamechartDetailViewProps {
  flamechart: Flamechart
  getCSSColorForFrame: (frame: Frame) => string
  selectedNode: CallTreeNode
}

export function FlamechartDetailView(props: FlamechartDetailViewProps) {
  const style = getFlamechartStyle(useTheme())

  const {flamechart, selectedNode} = props
  const {frame} = selectedNode

  const {profile} = useActiveProfileState() as ActiveProfileState
  const stats = profile.getExtraStatistics(selectedNode) as ExtraStatistics

  return (
    <div className={css(style.detailView)}>
      <StatisticsTable
        title={'This Instance'}
        cellStyle={style.thisInstanceCell}
        grandTotal={flamechart.getTotalWeight()}
        selectedTotal={selectedNode.getTotalWeight()}
        selectedSelf={selectedNode.getSelfWeight()}
        formatter={flamechart.formatValue.bind(flamechart)}
      />
      <StatisticsTable
        title={'All Instances'}
        cellStyle={style.allInstancesCell}
        grandTotal={flamechart.getTotalWeight()}
        selectedTotal={frame.getTotalWeight()}
        selectedSelf={frame.getSelfWeight()}
        formatter={flamechart.formatValue.bind(flamechart)}
      />
      <ExtraStatisticsTable
        cellStyle={style.allInstancesCell}
        formatter={flamechart.formatValue.bind(flamechart)}
        calls={stats.calls}
        min={stats.min}
        max={stats.max}
        median={stats.median}
        mean={stats.mean}
        stDev={stats.stDev}
        stErr={stats.stErr}
      />
      <StackTraceView node={selectedNode} getFrameColor={props.getCSSColorForFrame} />
    </div>
  )
}
