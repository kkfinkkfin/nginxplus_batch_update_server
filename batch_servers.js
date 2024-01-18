function getUpstreamName(r) {
   	var request_uri = r.variables.request_uri;
	var upstreamName=""; // - /api/9/http/all/upstreams/{httpupstreamName}/servers
	if (request_uri.length) {   
		var kvpair = request_uri.split('/');
		upstreamName = kvpair[6].toString();			
	}
 	//r.return(200, "hello" + upstreamName);
	return upstreamName;
}

function batch_servers(r) {
	var upsn = getUpstreamName(r);
	r.subrequest(`/api/9/http/upstreams/${upsn}/servers`)
	.then(res => {
		if (res.status != 200 ){
			throw new Error(`failed to get ${res.uri}: ${res.status}, ${res.responseText}`);
		}
		try {
			var up_json = JSON.parse(res.responseText);
			//r.return(200, JSON.stringify(up_json));
			return up_json;
		} catch(error) {
			throw new Error(`failed to parse ${res.responseText}: ${error.message}`);
		}
	})
	.then( async ups => {
		var upsn = getUpstreamName(r);

		var request_body = JSON.parse(r.variables.request_body); 
		var get_upstream = ups; 

		if (request_body.length) {
			if ( get_upstream.length == 0 ){
				for (var i = 0; i < request_body.length; i++) {
					//batch add servers
		    		await r.subrequest(`/api/8/http/upstreams/${upsn}/servers`, { method: 'POST', body: JSON.stringify(request_body[i]) })
		    		.then( res => {
		    			if (res.status != 201){
							throw new Error(`failed to add ${res.uri}: ${res.status}, ${res.responseText}`)
						}
		    		})
		    	} // end of for
				r.return(200, "Finish added upstream " + upsn);
			} else { 
				// change request_body json to dictionary
				var request_body_dic={}
				for (var i = 0; i < request_body.length; i++){
    				var value=request_body[i];
    				var key=request_body[i].server;
   					 request_body_dic[key]=value;
				}

				// change get_upstream json to dictionary
				var get_upstream_dic={}
				for (var j = 0; j < get_upstream.length; j++){
    				var value=get_upstream[j];
    				var key=get_upstream[j].server;
   					 get_upstream_dic[key]=value;
				}

				// find patch and add server
				for (var i = 0; i < request_body.length; i++) {
					    if( request_body[i].server in get_upstream_dic ) { // find if request server in get upstream server
    					    await r.subrequest(`/api/9/http/upstreams/${upsn}/servers/${get_upstream_dic[request_body[i].server].id}`, { method: 'PATCH', body: JSON.stringify(request_body[i]) })
			    			.then( res => {
		    					if (res.status != 200){
									throw new Error(`failed to patch ${res.uri}: ${res.status}, ${res.responseText}`)
								}
		    				})
    					} else {
    					    await r.subrequest(`/api/9/http/upstreams/${upsn}/servers`, { method: 'POST', body: JSON.stringify(request_body[i]) })
			    			.then( res => {
		    					if (res.status != 201){
									throw new Error(`failed to post ${res.uri}: ${res.status}, ${res.responseText}`)
								}
		    				})
    					}
				}

				// find delete server 
				for (var j = 0; j < get_upstream.length; j++){
					var isexit=false;
				    if( get_upstream[j].server in request_body_dic ) {
				    	isexit=true;
				    } 
				    if ( isexit == false ){
				        await r.subrequest(`/api/9/http/upstreams/${upsn}/servers/${get_upstream[j].id}`, { method: 'DELETE' })
			    		.then( res => {
		    				if (res.status != 200){
								throw new Error(`failed to delete ${res.uri}: ${res.status}, ${res.responseText}`)
							}
		    			})
				    }
				}

				r.return(200, "Finish updated upstream " + upsn);
			}
		} // end of if (request_body.length)
	})
	.catch(e => r.return(500, e.message));
}

export default { getUpstreamName, batch_servers }
	
