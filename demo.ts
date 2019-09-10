/*
 * @Description: demo
 * @Author: lushevol
 * @Date: 2019-09-06 17:11:30
 * @LastEditors: lushevol
 * @LastEditTime: 2019-09-10 09:21:40
 */
import { sipphone } from "./sipphone";
import { ISipAddress, ISipAccount, IMediaDom } from "./sipphone.declar";

const servers:ISipAddress[] = [{
  protocol: 'wss',
  server: '',
  port: 443
}]

const account:ISipAccount = {
  name: 'TEST USER',
  no: '1234',
  pwd: '1234'
}

const MD:IMediaDom = {
  remoteAudio: document.querySelector('#removeAudio'),
  remoteVideo: document.querySelector('#removeVideo'),
  localVideo: document.querySelector('#localVideo')
}

const SIPPHONE = new sipphone(account, servers)

const UA = SIPPHONE.init(MD)

SIPPHONE.on('callIn', () => {
  // triggerd when someone is calling you
})

// call someone whos number is 1235
SIPPHONE.on('accepted', () => {
  // triggerd when your call is accepted by peer
})
SIPPHONE.on('hungup', () => {
  // triggerd when call is finished
})
UA.invite(1235)