/*
 * @Description: 
 * @Author: lushevol
 * @Date: 2019-08-27 17:53:58
 * @LastEditors: lushevol
 * @LastEditTime: 2019-08-27 17:55:13
 */
import SIP from 'sip.js'

interface IWS {
  protocol: string,
  server: string,
  port: number
}
interface ISipAccount {
  name?: string,
  no: string,
  pwd: string
}

interface ISessionParams {
  audio: boolean,
  video: boolean
}

interface ICallbackObj {
  [propName: string]: any
}

interface IErrorMsg {
  message: string, 
  messageType: string, 
  reason: string, 
  code: string 
}

type OutgoingSession = SIP.ClientContext;
type IncomingSession = SIP.ServerContext;

export { IWS, ISipAccount, ISessionParams, ICallbackObj, IErrorMsg, OutgoingSession, IncomingSession }