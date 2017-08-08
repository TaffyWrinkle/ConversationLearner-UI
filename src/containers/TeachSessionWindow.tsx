import * as React from 'react';
import { returntypeof } from 'react-redux-typescript';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Modal } from 'office-ui-fabric-react/lib/Modal';
import { Nav, INavLink, INavLinkGroup, Link, CommandButton } from 'office-ui-fabric-react';
import { State } from '../types';
import { DisplayMode, TeachMode } from '../types/const';
import Webchat from './Webchat'
import TeachSessionAdmin from './TeachSessionAdmin'
import { Teach } from 'blis-models'
import { deleteTeachSessionAsync } from '../actions/deleteActions'
import { createTrainDialog, createTeachSessionAsync } from '../actions/createActions'
import { setCurrentTrainDialog, setCurrentTeachSession, setDisplayMode } from '../actions/displayActions'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

class TeachWindow extends React.Component<Props, any> {
    constructor(p: any) {
        super(p);
        this.state = {
            teachSession : new Teach({})
        }
        let currentAppId: string = this.props.apps.current.appId;
        this.props.createTeachSession(this.props.userKey, this.state.teachSession, currentAppId)
        // this.props.deleteTeachSession(this.props.userKey, testTeachSession, currentAppId)
        // this.props.setCurrentTeachSession(this.props.teachSessions.all.find((t: Teach) => t.teachId == ""))
        //need to create a new teach session
    }
    handleAbandon() {
        this.props.setDisplayMode(DisplayMode.AppAdmin);
        let currentAppId: string = this.props.apps.current.appId;
        this.props.deleteTeachSession(this.props.user.key, this.props.teachSession.current, currentAppId);
        // TODO: Still need to delete the associated training dialog.  This needs to be two steps
    }
    handleSave() {
        this.props.setDisplayMode(DisplayMode.AppAdmin);
        let currentAppId: string = this.props.apps.current.appId;
        this.props.deleteTeachSession(this.props.user.key, this.props.teachSession.current, currentAppId);
    }
    confirmDelete() {
        this.setState({
            open: true
        })
    }
    handleCloseModal() {
        this.setState({
            open: false
        })
    }
    render() {
        // Show done button if at least on round and at end of round
        let showDone = this.props.teachSession.currentConversationStack.length > 0 && this.props.teachSession.mode == TeachMode.Wait;
        let doneButton = (showDone) ?
                    <CommandButton
                        data-automation-id='randomID16'
                        disabled={false}
                        onClick={this.handleSave.bind(this)}
                        className='ms-font-su goldButton teachSessionHeaderButton'
                        ariaDescription='Done Teaching'
                        text='Done Teaching'
                    /> : null;

        return (
            <Modal 
                isOpen={true}
                isBlocking={true}
                containerClassName='teachModal'
            >
                <div className="gridContainer">
                    <div className="gridWebchat"><Webchat sessionType={"teach"}/></div>
                    <div className="gridAdmin"><TeachSessionAdmin/></div>
                    <div className="gridFooter">                                {doneButton}
                                    <CommandButton
                                        data-automation-id='randomID16'
                                        disabled={false}
                                        onClick={this.confirmDelete.bind(this)}
                                        className='ms-font-su grayButton teachSessionHeaderButton abandonTeach'
                                        ariaDescription='Abandon Teach'
                                        text='Abandon Teach'
                                    /></div>
                </div>
                <ConfirmDeleteModal open={this.state.open} onCancel={() => this.handleCloseModal()} onConfirm={() => this.handleAbandon()} title="Are you sure you want to abandon this teach session?" />
            </Modal>
        );
    }
}
/*
                <div className="ms-Grid">
                    <div className="ms-Grid-row">
                        <div className="ms-Grid-col webchat">
                            <Webchat sessionType={"teach"}/>
                        </div>
                        <div className="ms-Grid-col sessionAdmin">
                            <TeachSessionAdmin/>
                            <div className="teachSessionHeader">
                                {doneButton}
                                <CommandButton
                                    data-automation-id='randomID16'
                                    disabled={false}
                                    onClick={this.confirmDelete.bind(this)}
                                    className='ms-font-su grayButton teachSessionHeaderButton abandonTeach'
                                    ariaDescription='Abandon Teach'
                                    text='Abandon Teach'
                                />
                            </div>
                        </div>
                    </div>
                </div>
                */
const mapDispatchToProps = (dispatch: any) => {
    return bindActionCreators({
        createTeachSession: createTeachSessionAsync,
        deleteTeachSession: deleteTeachSessionAsync,
        setDisplayMode: setDisplayMode
    }, dispatch);
}
const mapStateToProps = (state: State) => {
    return {
        teachSession: state.teachSessions,
        userKey: state.user.key,
        apps: state.apps,
        user: state.user,
    }
}
// Props types inferred from mapStateToProps & dispatchToProps
const stateProps = returntypeof(mapStateToProps);
const dispatchProps = returntypeof(mapDispatchToProps);
type Props = typeof stateProps & typeof dispatchProps;

export default connect(mapStateToProps, mapDispatchToProps)(TeachWindow);
