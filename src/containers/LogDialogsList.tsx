import * as React from 'react';
import { returntypeof } from 'react-redux-typescript';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import TrainingGroundArenaHeader from '../components/TrainingGroundArenaHeader'
import { DetailsList, CommandButton, CheckboxVisibility, IColumn, SearchBox } from 'office-ui-fabric-react';
import { State } from '../types'
import { LogDialog } from 'blis-models'
import ChatSessionWindow from './ChatSessionWindow'
import LogDialogModal from './LogDialogModal'

interface IRenderableColumn extends IColumn {
    render: (x: LogDialog) => React.ReactNode
}

const returnStringWhenError = (s: string) => {
    return (f: Function) => {
        try {
            return f()
        }
        catch
        {
            return s
        }
    }
}

const returnErrorStringWhenError = returnStringWhenError("ERR")

let columns: IRenderableColumn[] = [
    {
        key: 'firstInput',
        name: 'First Input',
        fieldName: 'firstInput',
        minWidth: 100,
        maxWidth: 500,
        isResizable: true,
        render: logDialog => {
            if (logDialog.rounds && logDialog.rounds.length > 0) {
                let text = logDialog.rounds[0].extractorStep.text;
                return <span className='ms-font-m-plus'>{text}</span>;
            }
            return <span className="ms-Icon ms-Icon--Remove notFoundIcon" aria-hidden="true"></span>;
        }
    },
    {
        key: 'lastInput',
        name: 'Last Input',
        fieldName: 'lastInput',
        minWidth: 100,
        maxWidth: 500,
        isResizable: true,
        render: logDialog => {
            if (logDialog.rounds && logDialog.rounds.length > 0) {
                let text = logDialog.rounds[logDialog.rounds.length - 1].extractorStep.text;
                return <span className='ms-font-m-plus'>{text}</span>;
            }
            return <span className="ms-Icon ms-Icon--Remove notFoundIcon"></span>;
        }
    },
    {
        key: 'lastResponse',
        name: 'Last Response',
        fieldName: 'lastResponse',
        minWidth: 100,
        maxWidth: 500,
        isResizable: true,
        render: logDialog => {
            if (logDialog.rounds && logDialog.rounds.length > 0) {
                let scorerSteps = logDialog.rounds[logDialog.rounds.length - 1].scorerSteps;
                if (scorerSteps.length > 0) {
                    let actionId = scorerSteps[scorerSteps.length - 1].predictedAction;
                    let action = this.props.actions.find(a => a.actionId == actionId);
                    if (action) {
                        return <span className='ms-font-m-plus'>{action.payload}</span>;
                    }
                }
            }

            return <span className="ms-Icon ms-Icon--Remove notFoundIcon"></span>;
        }
    },
    {
        key: 'turns',
        name: 'Turns',
        fieldName: 'dialog',
        minWidth: 30,
        maxWidth: 50,
        render: logDialog => <span className='ms-font-m-plus'>{logDialog.rounds.length}</span>
    }
];

interface ComponentState {
    isChatSessionWindowOpen: boolean,
    isLogDialogWindowOpen: boolean,
    currentLogDialog: LogDialog,
    searchValue: string
}

class LogDialogsList extends React.Component<Props, ComponentState> {
    state = {
        isChatSessionWindowOpen: false,
        isLogDialogWindowOpen: false,
        currentLogDialog: null,
        searchValue: ''
    }

    onClickNewChatSession() {
        this.setState({
            isChatSessionWindowOpen: true
        })
    }

    onCloseChatSessionWindow() {
        this.setState({
            isChatSessionWindowOpen: false
        })
    }

    onChange(newValue: string) {
        let lcString = newValue.toLowerCase();
        this.setState({
            searchValue: lcString
        })
    }

    onLogDialogInvoked(logDialog: LogDialog) {
        this.setState({
            isLogDialogWindowOpen: true,
            currentLogDialog: logDialog
        })
    }

    onCloseLogDialogModal() {
        this.setState({
            isLogDialogWindowOpen: false,
            currentLogDialog: null
        })
    }

    render() {
        const logDialogItems = this.props.logDialogs.all;
        const currentLogDialog = this.state.currentLogDialog;
        return (
            <div>
                <TrainingGroundArenaHeader title="Log Dialogs" description="Use this tool to test the current versions of your application, to check if you are progressing on the right track ..." />
                <div className="entityCreator">
                    <CommandButton
                        onClick={() => this.onClickNewChatSession()}
                        className='blis-button--gold'
                        ariaDescription='Create a New Chat Session'
                        text='New Chat Session'
                    />
                    <ChatSessionWindow
                        app={this.props.apps.current}
                        open={this.state.isChatSessionWindowOpen}
                        onClose={() => this.onCloseChatSessionWindow()}
                     />
                </div>
                <SearchBox
                    className="ms-font-m-plus"
                    onChange={(newValue) => this.onChange(newValue)}
                    onSearch={(newValue) => this.onChange(newValue)}
                />
                <DetailsList
                    className="ms-font-m-plus"
                    items={logDialogItems}
                    columns={columns}
                    checkboxVisibility={CheckboxVisibility.hidden}
                    onRenderItemColumn={(logDialog, i, column: IRenderableColumn) => returnErrorStringWhenError(() => column.render(logDialog))}
                    onActiveItemChanged={logDialog => this.onLogDialogInvoked(logDialog)}
                />
                <LogDialogModal
                    open={this.state.isLogDialogWindowOpen}
                    app={this.props.apps.current}
                    onClose={() => this.onCloseLogDialogModal()}
                    logDialog={currentLogDialog}
                />
            </div>
        );
    }
}
const mapDispatchToProps = (dispatch: any) => {
    return bindActionCreators({
    }, dispatch)
}
const mapStateToProps = (state: State) => {
    return {
        logDialogs: state.logDialogs,
        userKey: state.user.key,
        apps: state.apps,
        chatSessions: state.chatSessions
    }
}
// Props types inferred from mapStateToProps & dispatchToProps
const stateProps = returntypeof(mapStateToProps);
const dispatchProps = returntypeof(mapDispatchToProps);
type Props = typeof stateProps & typeof dispatchProps;

export default connect(mapStateToProps, mapDispatchToProps)(LogDialogsList);